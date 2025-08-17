import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('arabic');

  const [showRealtimeChat, setShowRealtimeChat] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Get API URL from environment or use production backend
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://bulbulfriend-backend.up.railway.app';

  const startRecording = async () => {
    if (isStreaming) return;
    audioQueueRef.current = [];
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext);
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      // Use modern AudioWorkletNode instead of deprecated ScriptProcessorNode
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create a simple audio processor using AudioWorklet if available, fallback to ScriptProcessor
      if (audioContextRef.current.audioWorklet) {
        try {
          // Create a simple audio worklet for processing
          const processor = audioContextRef.current.createMediaStreamDestination();
          source.connect(processor);
          
          // Monitor audio levels for visualization
          const analyser = audioContextRef.current.createAnalyser();
          source.connect(analyser);
          
          mediaRecorderRef.current = { source, processor, analyser };
        } catch (error) {
          console.warn('AudioWorklet not supported, falling back to ScriptProcessor:', error);
          // Fallback to ScriptProcessor for older browsers
          const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              let s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            audioQueueRef.current.push(new Blob([int16.buffer], { type: 'audio/webm' }));
          };
          source.connect(processor);
          processor.connect(audioContextRef.current.destination);
          mediaRecorderRef.current = { source, processor };
        }
      } else {
        // Fallback for older browsers
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            let s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          audioQueueRef.current.push(new Blob([int16.buffer], { type: 'audio/webm' }));
        };
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        mediaRecorderRef.current = { source, processor };
      }

      setIsRecording(true);
    } catch (error) {
      console.error('Recording setup failed:', error);
      alert('Microphone access error: ' + error.message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.source) {
        mediaRecorderRef.current.source.disconnect();
      }
      if (mediaRecorderRef.current.processor) {
        mediaRecorderRef.current.processor.disconnect();
      }
      if (mediaRecorderRef.current.analyser) {
        mediaRecorderRef.current.analyser.disconnect();
      }
    }
    setIsRecording(false);

    const blob = new Blob(audioQueueRef.current, { type: 'audio/webm' });
    audioQueueRef.current = [];

    if (blob.size > 0) {
      await startRealtimeConversation(blob);
    }
  };

  const playPcmChunk = (pcmData) => {
    if (!audioContextRef.current) return;
    
    const float32 = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32[i] = pcmData[i] / 32768.0;
    }
    const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 16000);
    audioBuffer.copyToChannel(float32, 0);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  const processStream = async (reader) => {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        setIsStreaming(false);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.substring(6);
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "response.audio_transcript.delta") {
              setResponse(prev => prev + event.delta);
            } else if (event.type === "response.audio.delta") {
              const audioData = atob(event.delta);
              const pcmData = new Int16Array(audioData.length / 2);
              for (let i = 0; i < audioData.length; i += 2) {
                // Assuming little-endian 16-bit PCM
                pcmData[i / 2] = (audioData.charCodeAt(i + 1) << 8) | audioData.charCodeAt(i);
              }
              playPcmChunk(pcmData);
            } else if (event.type === "rate_limits.updated") {
              console.log("Final chunk received");
              setIsStreaming(false);
            }
          } catch (e) {
            console.error("Failed to parse SSE event:", e, "line:", jsonStr);
          }
        }
      }
    }
  };

  const startRealtimeConversation = async (audioBlob) => {
    setIsStreaming(true);
    setResponse(""); // Clear previous response

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      // Use the proper API URL instead of hardcoded localhost
      const response = await fetch(`${API_BASE_URL}/api/realtime-conversation`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      processStream(response.body.getReader());

    } catch (error) {
      console.error("Realtime conversation failed:", error);
      setResponse("Error: Could not connect to the server. Please check your connection.");
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