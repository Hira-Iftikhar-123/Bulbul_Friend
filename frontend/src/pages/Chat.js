import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import CorsTest from '../components/CorsTest';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('english');

  const [showRealtimeChat, setShowRealtimeChat] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startRecording = async () => {
    if (isStreaming) return;
    audioChunksRef.current = [];
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      // Use MediaRecorder instead of deprecated ScriptProcessor
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Recording setup failed:', error);
      alert('Microphone access error: ' + error.message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);

    // Wait for the final data to be available
    setTimeout(async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      if (blob.size > 0) {
        await startRealtimeConversation(blob);
      }
    }, 100);
  };

  const startRealtimeConversation = async (audioBlob) => {
    setIsStreaming(true);
    setResponse(""); // Clear previous response

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      // Use the API service instead of direct fetch
      const response = await chatAPI.realtimeConversation(formData);
      
      if (response && response.data) {
        // Handle the response data
        setResponse(response.data);
      }
    } catch (error) {
      console.error("Realtime conversation failed:", error);
      setResponse("Error: Could not connect to the server.");
    } finally {
      setIsStreaming(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    try {
      setIsLoading(true);
      const res = await chatAPI.sendMessage(message, language);
      setResponse(prev => prev + '\n' + (res?.response || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative'
    }}>
      <div className="max-w-4xl mx-auto p-4"> 
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Chat with Bulbul</h1>
        
        <div className="mb-4 flex justify-between items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language:
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field w-auto"
            >
              <option value="arabic">العربية</option>
              <option value="english">English</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowRealtimeChat(!showRealtimeChat)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
            >
              {showRealtimeChat ? 'Hide Voice Chat' : 'Show Voice Chat'}
            </button>
            
            <a
              href="/streaming-tts-test"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
            >
              Full TTS Test
            </a>
          </div>
        </div>

        {/* Add CORS Test Component */}
        <div className="mb-6">
          <CorsTest />
        </div>

        <form onSubmit={sendMessage} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={language === 'arabic' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
              className="input-field flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>

        {response && (
          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2">Bulbul's Response:</h3>
            <div className={language === 'arabic' ? 'arabic-text' : ''}>
              {response}
            </div>
          </div>
        )}

        {showRealtimeChat && (
          <div className="space-y-4">
            <div className="card bg-white border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2">Real-time Voice Chat</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click start and speak. Your voice will be sent to the backend for a real-time response.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } disabled:opacity-50`}
                  disabled={isStreaming}
                >
                  {isRecording ? 'Stop Recording' : isStreaming ? 'Streaming...' : 'Start Recording'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Chat; 