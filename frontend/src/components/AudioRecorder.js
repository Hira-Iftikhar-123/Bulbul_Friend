import React, { useState, useRef, useCallback } from 'react';
import { streamingTTSAPI } from '../services/api';

const AudioRecorder = ({ onResponse }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [audioChunks, setAudioChunks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Try different MIME types in order of preference
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }
      
      console.log('Using MIME type:', selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      setAudioChunks([]);
      // Clear audio queue when starting new recording
      audioQueueRef.current = [];
      isPlayingAudioRef.current = false;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped');
        // Use a callback to get the latest audioChunks state
        setAudioChunks(prevChunks => {
          console.log('Final chunks count:', prevChunks.length);
          const audioBlob = new Blob(prevChunks, { type: selectedMimeType });
          console.log('Audio blob size:', audioBlob.size);
          setCurrentAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
          return prevChunks;
        });
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error: ' + event.error);
      };
      
      // Start recording with 1-second timeslices for better chunking
      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log('Recording started');
      
      // Start monitoring audio levels
      startAudioLevelMonitoring(stream);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone: ' + error.message);
    }
  }, [audioChunks]);

  const startAudioLevelMonitoring = useCallback((stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!isRecording) {
          setAudioLevel(0);
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.warn('Could not start audio level monitoring:', error);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      // Stop the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const processAudio = useCallback(async () => {
    if (!currentAudio) return;
    
    setIsProcessing(true);
    setResponseText('');
    setTranscript('');
    
    try {
      // Create a file from the blob
      const audioFile = new File([currentAudio], 'recording.webm', { type: 'audio/webm' });
      
      // First, send to /openai endpoint for STT
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      const response = await fetch('http://localhost:8000/api/openai', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Failed to read error response';
        }
        console.error('API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('STT result:', result);
      const transcript = result?.text;
      
      if (transcript) {
        setTranscript(transcript);
        setFinalTranscript(transcript);
        console.log("Final transcript:", transcript);
        
        // Send transcript to streaming TTS endpoint
        try {
          await streamingTTSAPI.processTranscript(transcript, 'arabic', (chunk) => {
            console.log('Streaming TTS chunk received:', chunk);
            if (chunk.text) {
              setResponseText(prev => prev + chunk.text);
            }
            if (chunk.audio) {
              // Play the audio chunk
              playAudioChunk(chunk.audio);
            }
            
            // Call the parent callback if provided
            if (onResponse) {
              onResponse(chunk);
            }
          });
        } catch (error) {
          console.error('Error processing transcript with streaming TTS:', error);
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentAudio, onResponse, playAudioChunk]);

  const playAudioChunk = useCallback((base64Audio) => {
    try {
      // Decode base64 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio blob and add to queue
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add to queue
      audioQueueRef.current.push({ audioUrl, audioBlob });
      
      // Start playing if not already playing
      if (!isPlayingAudioRef.current) {
        playNextInQueue();
      }
    } catch (error) {
      console.error('Error adding audio chunk to queue:', error);
    }
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      return;
    }
    
    isPlayingAudioRef.current = true;
    const { audioUrl, audioBlob } = audioQueueRef.current.shift();
    
    const audio = new Audio(audioUrl);
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      // Continue with next in queue even if this one fails
      playNextInQueue();
    });
    
    // When this audio finishes, play the next one
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      playNextInQueue();
    };
    
    // Also handle errors to continue queue
    audio.onerror = () => {
      console.error('Audio playback error');
      URL.revokeObjectURL(audioUrl);
      playNextInQueue();
    };
  }, []);

  const clearAll = useCallback(() => {
    setTranscript('');
    setResponseText('');
    setCurrentAudio(null);
    setAudioChunks([]);
    setFinalTranscript('');
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
  }, []);

  // Check browser support
  const isSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  return (
    <div className="audio-recorder">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Voice Chat</h3>
        <p className="text-sm text-gray-600 mb-4">
          Record your voice and get a streaming response with audio
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        {currentAudio && (
          <button
            onClick={processAudio}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Send Audio'}
          </button>
        )}
        
        <button
          onClick={clearAll}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
        >
          Clear
        </button>
      </div>

      {isRecording && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-red-700">Recording...</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-8 bg-gray-300 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 transition-all duration-100"
                  style={{ 
                    height: `${Math.max(10, (audioLevel / 255) * 100)}%`,
                    minHeight: '4px'
                  }}
                ></div>
              </div>
              <span className="text-xs text-red-600">{Math.round((audioLevel / 255) * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-blue-700">Processing audio and streaming response...</span>
          </div>
        </div>
      )}

      {transcript && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold mb-2 text-gray-700">Your Message:</h4>
          <p className="text-gray-800">{transcript}</p>
        </div>
      )}

      {responseText && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-700">Bulbul's Response:</h4>
          <p className="text-blue-800">{responseText}</p>
        </div>
      )}

      {currentAudio && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Recorded Audio:</h4>
          <div className="mb-2 text-sm text-gray-600">
            Size: {(currentAudio.size / 1024).toFixed(1)} KB
          </div>
          <audio controls className="w-full">
            <source src={URL.createObjectURL(currentAudio)} type={currentAudio.type} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 