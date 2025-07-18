import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown'

const arcColor = '#3e2912';
const arcBgColor = '#a88a6a';
const arcWidth = 12;
const arcRadius = 90;
const arcCircumference = Math.PI * arcRadius;
const progress = 0.60;

const PersonalDashboard = () => {
  const [showLogout, setShowLogout] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [llmResponse, setLlmResponse] = useState(false)
  const [llmresult, setLlmResult] = useState('')
  const [notifications, setNotifications] = useState([
    "Your lesson with Bulbul tutor is tomorrow at 10am",
    "New quiz unlocked in Module 3",
  ]);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(10).fill(0));
  const [transcription, setTranscription] = useState(''); // latest chunk
  const [fullTranscription, setFullTranscription] = useState('');
  const [lastLanguage, setLastLanguage] = useState('arabic');
  const transcriptTimerRef = useRef(null);
  const SILENCE_MS = 10000; // 10-second gap to consider transcript complete
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState(''); // 'realtime', 'file', 'direct'
  const [isReceivingTranscription, setIsReceivingTranscription] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const websocketRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auto-initialize and debug on component mount
  useEffect(() => {
    console.log('🚀 PersonalDashboard component mounted');
    
    // Check initial states
    console.log('🔍 Initial state check:');
    console.log('- Browser:', navigator.userAgent);
    console.log('- Protocol:', window.location.protocol);
    console.log('- Host:', window.location.host);
    console.log('- MediaDevices available:', !!navigator.mediaDevices);
    console.log('- getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
    console.log('- AudioContext available:', !!(window.AudioContext || window.webkitAudioContext));
    console.log('- WebSocket available:', !!window.WebSocket);
    
    // Check backend connectivity
    console.log('🔍 Checking backend connectivity...');
    fetch('http://localhost:8000/health')
      .then(response => {
        if (response.ok) {
          console.log('✅ Backend is running and healthy');
        } else {
          console.error('❌ Backend responded with error:', response.status);
        }
      })
      .catch(error => {
        console.error('❌ Backend is not running or not accessible:', error.message);
        console.log('💡 Make sure to start the backend with: python main.py');
      });
    
    // Removed automatic audio test – runs only when user clicks "Test Audio"
    
  }, []);

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up PersonalDashboard component...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Watch for transcription completion and trigger LLM
  useEffect(() => {
    if (fullTranscription.trim() && !isReceivingTranscription) {
      console.log('🤖 All transcription complete, sending to LLM:', fullTranscription);
      sendToChat(fullTranscription, lastLanguage);
    }
  }, [isReceivingTranscription, fullTranscription, lastLanguage]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Initialize WebSocket connection for real-time streaming
  const initializeWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Attempting WebSocket connection to ws://localhost:8000/ws/audio-stream');
        
        // Check if backend is running first
        fetch('http://localhost:8000/health')
          .then(response => {
            if (!response.ok) {
              throw new Error('Backend not responding');
            }
            console.log('✅ Backend health check passed');
            
            // Now try WebSocket
            const ws = new WebSocket('ws://localhost:8000/ws/audio-stream');
            
            ws.onopen = () => {
              console.log('✅ WebSocket connected successfully');
              websocketRef.current = ws;
              resolve(ws);
            };
            
            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              console.log('📨 WebSocket message received:', data);
              
              if (data.type === 'transcription') {
                console.log('📝 Transcription received:', data.transcription);
                setTranscription(data.transcription);
                setFullTranscription(prev => (prev + ' ' + data.transcription).trim());
                setLastLanguage(data.language || 'arabic');
                setIsProcessing(false);
                setProcessingMode('realtime');
                
                // Mark that we're receiving transcription and reset the completion timer
                setIsReceivingTranscription(true);
                
                // Clear any existing timer and set new one to detect completion
                if (transcriptTimerRef.current) {
                  clearTimeout(transcriptTimerRef.current);
                }
                
                // Set timer to detect when transcription stops coming
                transcriptTimerRef.current = setTimeout(() => {
                  console.log('🏁 No more transcription chunks received, marking complete');
                  setIsReceivingTranscription(false);
                  transcriptTimerRef.current = null;
                }, SILENCE_MS);

              } else if (data.type === 'error') {
                console.error('❌ WebSocket transcription error:', data.message);
                // Fallback to file upload
                fallbackToFileUpload();
              }
            };
            
            ws.onerror = (error) => {
              console.error('❌ WebSocket error:', error);
              reject(new Error('WebSocket connection failed'));
            };
            
            ws.onclose = (event) => {
              console.log('🔌 WebSocket connection closed:', event.code, event.reason);
              websocketRef.current = null;
              // If we were in real-time processing, clear processing flag so UI resets properly
              if (processingMode === 'realtime') {
                setIsProcessing(false);
              }

              // Connection closed - transcription may still be updating
              console.log('🔌 WebSocket closed, transcription may continue updating...');
            };
            
          })
          .catch(backendError => {
            console.error('❌ Backend health check failed:', backendError);
            reject(new Error('Backend server not running on localhost:8000'));
          });
        
      } catch (error) {
        console.error('❌ WebSocket initialization failed:', error);
        reject(error);
      }
    });
  };

  // Initialize audio context and analyzer
  const initializeAudio = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000
        } 
      });
      
      console.log('✅ Microphone access granted');
      console.log('Stream tracks:', stream.getTracks());
      
      // Create audio context at 16 kHz to match backend PCM expectations
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      console.log('Audio context state:', audioContextRef.current.state);
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('Audio context resumed');
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      console.log('✅ Audio analysis setup complete');
      console.log('Analyser frequency bin count:', analyserRef.current.frequencyBinCount);
      
      return stream;
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert('Error accessing microphone: ' + error.message);
      }
      
      return null;
    }
  };

  // Update audio levels for wave animation
  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording) {
      console.log('Audio level update stopped - analyser or recording state changed');
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average levels for visualization
    const levels = [];
    const chunkSize = Math.floor(dataArray.length / 10);
    
    let totalVolume = 0;
    
    for (let i = 0; i < 10; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = dataArray.slice(start, end);
      const average = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
      const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
      levels.push(normalizedLevel);
      totalVolume += normalizedLevel;
    }
    
    // Debug: Log audio levels occasionally
    if (Math.random() < 0.1) { // 10% chance to log
      console.log('Audio levels:', levels.map(l => Math.round(l * 100)).join(','), 'Total volume:', Math.round(totalVolume * 100));
    }
    
    setAudioLevels(levels);
    
    // Continue animation
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
  };

  // Convert audio blob to base64 for WebSocket transmission
  const audioToBase64 = (audioBlob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(audioBlob);
    });
  };

  // Real-time audio streaming via WebSocket
  const startRealTimeStreaming = async (stream) => {
    try {
      console.log('🌐 Starting real-time audio streaming...');
      setProcessingMode('realtime');
      
      // Initialize WebSocket
      console.log('🔌 Connecting to WebSocket...');
      const ws = await initializeWebSocket();
      
      // Try modern AudioWorklet for raw PCM streaming
      try {
        const audioContext = audioContextRef.current; // reuse existing context for visualisation
        await audioContext.audioWorklet.addModule('/pcmWorklet.js');
        const source = audioContext.createMediaStreamSource(stream);
        const pcmNode = new AudioWorkletNode(audioContext, 'pcm-worklet');
        // tap into analyser for bars and to pcm worklet for streaming
        if (analyserRef.current) {
          source.connect(analyserRef.current);
        }
        source.connect(pcmNode);

        pcmNode.port.onmessage = ({ data }) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const uint8 = new Uint8Array(data);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          const b64 = btoa(binary);
          ws.send(JSON.stringify({ type: 'pcm_chunk', data: b64, sample_rate: 16000 }));
        };

        mediaRecorderRef.current = null; // using worklet path

        // stopping logic – when stopRecording is called we disconnect nodes
        mediaRecorderRef.current = {
          stop: () => {
            source.disconnect();
            pcmNode.disconnect();
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'end_stream', sample_rate: 16000 }));
            }
          },
          stream
        };

        console.log('✅ AudioWorklet PCM streaming active');
        return true;
      } catch (workletError) {
        console.warn('AudioWorklet unavailable, falling back to MediaRecorder:', workletError.message);
      }

      // ----- Fallback MediaRecorder path (existing) -----
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
        console.log('⚠️ Opus not supported, using basic webm');
      }

      console.log('📱 Creating MediaRecorder with options:', options);

      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          console.log('📡 Sending audio chunk:', event.data.size, 'bytes');
          const base64Audio = await audioToBase64(event.data);
          const message = { type: 'audio_chunk', data: base64Audio, sample_rate: 16000 };
          try {
            ws.send(JSON.stringify(message));
            console.log('✅ Audio chunk sent successfully');
          } catch (error) {
            console.error('❌ Error sending audio chunk:', error);
          }
        } else {
          console.log('⚠️ Skipping audio chunk - WebSocket not ready or no data');
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Real-time MediaRecorder stopped');
        if (ws.readyState === WebSocket.OPEN) {
          console.log('📡 Sending end stream signal...');
          // Signal end of stream
          ws.send(JSON.stringify({ type: 'end_stream', sample_rate: 16000 }));
          // Give the server a small grace period to process last chunk
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'Finished streaming');
            }
            websocketRef.current = null;
          }, 300);
        } else {
          websocketRef.current = null;
        }
      };
      
      mediaRecorderRef.current.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
      };
      
      // Start recording with small chunks for real-time processing
      console.log('🎬 Starting MediaRecorder with 1-second chunks...');
      mediaRecorderRef.current.start(1000); // 1 second chunks (fallback)
      
      console.log('✅ Real-time streaming setup complete');
      return true;
      
    } catch (error) {
      console.error('❌ Real-time streaming failed:', error);
      return false;
    }
  };

  // Fallback to file upload
  const fallbackToFileUpload = async () => {
    console.log('Falling back to file upload method...');
    setProcessingMode('file');
    
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await transcribeAudio(audioBlob);
    } else {
      // No audio data, reset state
      resetRecordingState();
    }
  };

  // Fallback to direct recording
  const fallbackToDirectRecording = async () => {
    console.log('Falling back to direct recording method...');
    setProcessingMode('direct');
    await transcribeDirectRecording();
  };

  // Start recording with priority: Real-time > File Upload > Direct Recording
  const startRecording = async () => {
    try {
      console.log('🎙️ Starting recording process...');
      
      const stream = await initializeAudio();
      if (!stream) {
        console.error('❌ Failed to initialize audio');
        return;
      }

      console.log('✅ Audio initialized, setting recording state...');
      setIsRecording(true);
      setTranscription('');
      setFullTranscription('');
      setIsReceivingTranscription(false);
      setIsProcessing(true);
      audioChunksRef.current = [];

      console.log('🎵 Starting audio level monitoring...');
      // updateAudioLevels will start via useEffect when isRecording becomes true

      console.log('🌐 Attempting real-time streaming...');
      // Try real-time streaming first
      const realTimeSuccess = await startRealTimeStreaming(stream);
      
      if (!realTimeSuccess) {
        console.log('⚠️ Real-time streaming failed, setting up file upload fallback...');
        
        // Setup file upload fallback
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';
        
        console.log('📁 Using MIME type:', mimeType);
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('📦 Audio chunk received:', event.data.size, 'bytes');
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          console.log('🛑 MediaRecorder stopped, processing audio...');
          await fallbackToFileUpload();
        };

        mediaRecorderRef.current.start();
        setProcessingMode('file');
        console.log('✅ File upload fallback setup complete');
      } else {
        console.log('✅ Real-time streaming setup successful');
      }
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      
      // Last resort: direct recording
      console.log('🔄 Attempting direct recording fallback...');
      await fallbackToDirectRecording();
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped:', e);
      }
    }
    
    setIsRecording(false);
    
    // Stop audio level monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context (but don't close immediately for real-time)
    if (audioContextRef.current && processingMode !== 'realtime') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log('AudioContext already closed:', e);
      }
      audioContextRef.current = null;
    }
    
    // For real-time processing, the WebSocket will be closed in mediaRecorder.onstop
    if (processingMode !== 'realtime' && websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch (e) {
        console.log('WebSocket already closed:', e);
      }
      websocketRef.current = null;
    }
    
    // Stop all tracks
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.log('Track already stopped:', e);
        }
      });
    }
    
    // Reset mediaRecorder
    mediaRecorderRef.current = null;
    
    // If not using real-time, processing will happen in onstop
    if (processingMode !== 'realtime') {
      setIsProcessing(true);
    }
    
    console.log('Recording stopped successfully');
  };

  // Reset all states (helper function)
  const resetRecordingState = () => {
    setIsRecording(false);
    setIsProcessing(false);
    setProcessingMode('');
    setTranscription('');
    setFullTranscription('');
    setIsReceivingTranscription(false);
    if (transcriptTimerRef.current) {
      clearTimeout(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
    }
    
    // Clean up any remaining resources
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log('AudioContext cleanup:', e);
      }
      audioContextRef.current = null;
    }
    
    if (websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch (e) {
        console.log('WebSocket cleanup:', e);
      }
      websocketRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      } catch (e) {
        console.log('MediaRecorder cleanup:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Reset audio chunks
    audioChunksRef.current = [];
    
    console.log('Recording state reset');
  };

  // Transcribe audio using file upload (FALLBACK)
  const transcribeAudio = async (audioBlob) => {
    try {
      console.log('Using file upload transcription...');
      
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await fetch('http://localhost:8000/api/transcribe-voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.log('File upload failed, trying direct recording...');
        await fallbackToDirectRecording();
        return;
      }

      const result = await response.json();
      if (!result.transcription.trim()) {
        setTranscription('Sorry, to get an answer you should say something!');
        setIsProcessing(false);
        return;
      }
      
      setTranscription(result.transcription);
      setIsProcessing(false);
      await sendToChat(result.transcription, result.language);

    } catch (error) {
      console.error('Error transcribing audio:', error);
      await fallbackToDirectRecording();
    } finally {
      // Always reset state after processing
      setTimeout(() => {
        if (!isRecording) {
          resetRecordingState();
        }
      }, 2000); // Reset after 2 seconds to show result
    }
  };

  // Send transcribed text to chat endpoint
  const sendToChat = async (message, language) => {
    try {
      const chatResponse = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          language: language || 'arabic'
        }),
      });

      if (chatResponse.ok) {
        const chatResult = await chatResponse.json();
        console.log('Chat response:', chatResult.response);
        setLlmResult(chatResult.response);
        setLlmResponse(true);
        // Don't clear transcript - let user manually clear or start new recording
        setIsReceivingTranscription(false);
      }
    } catch (error) {
      console.error('Error sending to chat:', error);
    }
  };

  // Fallback: Use direct recording endpoint
  const transcribeDirectRecording = async () => {
    try {
      console.log('Using direct recording endpoint...');
      const response = await fetch('http://localhost:8000/api/record-and-transcribe?duration=3', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTranscription(result.transcription);
      setIsProcessing(false);
      await sendToChat(result.transcription, result.language);
      
    } catch (error) {
      console.error('Error with direct recording:', error);
      setTranscription('Error transcribing audio. Please try again.');
      setIsProcessing(false);
    } finally {
      // Always reset state after processing
      setTimeout(() => {
        if (!isRecording) {
          resetRecordingState();
        }
      }, 2000); // Reset after 2 seconds to show result
    }
  };

  // Get processing mode display text
  const getProcessingModeText = () => {
    switch (processingMode) {
      case 'realtime':
        return 'Real-time processing...';
      case 'file':
        return 'Processing audio file...';
      case 'direct':
        return 'Direct recording processing...';
      default:
        return 'Processing your voice...';
    }
  };

  // Start audio level monitoring when recording starts
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      updateAudioLevels();
    }
  }, [isRecording]);

  const themeColors = {
    light: {
      backgroundImage: 'url(/Wallpaper_Bulbul.jpeg)',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative',
    },
    dark: {
      backgroundImage: 'linear-gradient(135deg, #0000FF 0%, #00008B 50%, #00008B 100%)',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      textPrimary: '#ffffff',
      textSecondary: '#b8c5d6',
      cardBg: 'rgba(255, 255, 255, 0.10)',
      cardBorder: '#4a5568',
      buttonBg: 'rgba(255,255,255,0.15)',
      buttonBorder: '#ffffff',
      dropdownBg: 'rgba(26, 26, 46, 0.95)',
      personaBg: 'rgba(255,255,255,0.15)',
    }
  };

  

  const colors = themeColors[isDarkMode ? 'dark' : 'light'];

  // Theme-aware colors for wave and mic
  const waveColor = isDarkMode ? '#fffbe6' : '#3e2912';
  const micColor = isDarkMode ? '#fffbe6' : '#3e2912';

  // Test audio functionality
  const [testResults, setTestResults] = useState([]);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  const testAudio = async () => {
    console.log('🧪 Testing audio functionality...');
    setIsTestingAudio(true);
    setTestResults([]);
    setShowTestResults(true);
    
    const results = [];
    
    try {
      // Test 1: Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not supported in this browser');
        results.push({ test: 'getUserMedia API', status: 'failed', message: 'Not supported in this browser' });
        setTestResults([...results]);
        setIsTestingAudio(false);
        return false;
      }
      console.log('✅ getUserMedia API available');
      results.push({ test: 'getUserMedia API', status: 'passed', message: 'Available' });
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Check microphone permissions
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        console.log('🎤 Microphone permission status:', permissionStatus.state);
        results.push({ test: 'Microphone Permissions', status: permissionStatus.state === 'granted' ? 'passed' : 'warning', message: permissionStatus.state });
        setTestResults([...results]);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.log('⚠️ Could not check microphone permissions:', e.message);
        results.push({ test: 'Microphone Permissions', status: 'warning', message: 'Could not check' });
        setTestResults([...results]);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Test 3: Request microphone access
      console.log('🎤 Requesting microphone access...');
      results.push({ test: 'Microphone Access', status: 'testing', message: 'Requesting access...' });
      setTestResults([...results]);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      console.log('✅ Microphone access granted');
      console.log('📊 Stream details:', {
        active: stream.active,
        tracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      results[results.length - 1] = { test: 'Microphone Access', status: 'passed', message: `${stream.getAudioTracks().length} audio track(s) available` };
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test 4: Audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.error('❌ AudioContext not supported');
        results.push({ test: 'Audio Context', status: 'failed', message: 'Not supported' });
        setTestResults([...results]);
        setIsTestingAudio(false);
        return false;
      }
      
      const audioContext = new AudioContext();
      console.log('✅ Audio context created');
      console.log('🔊 Audio context state:', audioContext.state);
      
      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('✅ Audio context resumed');
      }
      
      results.push({ test: 'Audio Context', status: 'passed', message: `State: ${audioContext.state}` });
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test 5: Audio analyser
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      console.log('✅ Audio analyser connected');
      
      results.push({ test: 'Audio Analyser', status: 'passed', message: 'Connected successfully' });
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test 6: Audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      console.log('📈 Audio levels test - Average:', average, 'Array length:', dataArray.length);
      
      results.push({ test: 'Audio Levels', status: 'passed', message: `Average: ${average.toFixed(1)}, Bins: ${dataArray.length}` });
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test 7: WebSocket connection
      console.log('🌐 Testing WebSocket connection...');
      results.push({ test: 'WebSocket Connection', status: 'testing', message: 'Connecting...' });
      setTestResults([...results]);
      
      try {
        const testWs = new WebSocket('ws://localhost:8000/ws/audio-stream');
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            testWs.close();
            reject(new Error('Connection timeout'));
          }, 5000);
          
          testWs.onopen = () => {
            console.log('✅ WebSocket connection successful');
            clearTimeout(timeout);
            testWs.close();
            resolve();
          };
          
          testWs.onerror = (error) => {
            console.error('❌ WebSocket connection failed:', error);
            clearTimeout(timeout);
            reject(error);
          };
          
          testWs.onclose = () => {
            console.log('🔌 WebSocket connection closed');
          };
        });
        
        results[results.length - 1] = { test: 'WebSocket Connection', status: 'passed', message: 'Connected successfully' };
        setTestResults([...results]);
        
      } catch (wsError) {
        console.error('❌ WebSocket test failed:', wsError);
        results[results.length - 1] = { test: 'WebSocket Connection', status: 'failed', message: wsError.message };
        setTestResults([...results]);
      }
      
      // Cleanup
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      console.log('🎉 Audio test completed!');
      results.push({ test: 'Test Complete', status: 'passed', message: 'All tests finished' });
      setTestResults([...results]);
      setIsTestingAudio(false);
      return true;
      
    } catch (error) {
      console.error('❌ Audio test failed:', error);
      
      let errorMessage = error.message;
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      }
      
      results.push({ test: 'Error', status: 'failed', message: errorMessage });
      setTestResults([...results]);
      setIsTestingAudio(false);
      return false;
    }
  };

  // Debug state management
  const [debugResults, setDebugResults] = useState([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [showDebugResults, setShowDebugResults] = useState(false);

  const runDebugCheck = async () => {
    console.log('🔍 Manual debug check...');
    setIsDebugging(true);
    setDebugResults([]);
    setShowDebugResults(true);
    
    const results = [];
    
    // Current state
    const currentState = {
      isRecording,
      isProcessing,
      processingMode,
      transcription,
      audioLevels,
      hasWebSocket: !!websocketRef.current,
      hasAudioContext: !!audioContextRef.current,
      hasMediaRecorder: !!mediaRecorderRef.current
    };
    
    console.log('Current state:', currentState);
    results.push({ test: 'Component State', status: 'info', message: `Recording: ${isRecording}, Processing: ${isProcessing}, Mode: ${processingMode}` });
    results.push({ test: 'Resources', status: 'info', message: `WebSocket: ${!!websocketRef.current}, AudioContext: ${!!audioContextRef.current}, MediaRecorder: ${!!mediaRecorderRef.current}` });
    setDebugResults([...results]);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check backend
    results.push({ test: 'Backend Health', status: 'testing', message: 'Checking...' });
    setDebugResults([...results]);
    
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      console.log('✅ Backend health:', data);
      results[results.length - 1] = { test: 'Backend Health', status: 'passed', message: `Status: ${data.status}, Uptime: ${data.uptime}s` };
      setDebugResults([...results]);
    } catch (e) {
      console.error('❌ Backend error:', e);
      results[results.length - 1] = { test: 'Backend Health', status: 'failed', message: e.message };
      setDebugResults([...results]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check browser capabilities
    results.push({ test: 'Browser Support', status: 'info', message: `getUserMedia: ${!!navigator.mediaDevices?.getUserMedia}, WebSocket: ${!!window.WebSocket}, AudioContext: ${!!(window.AudioContext || window.webkitAudioContext)}` });
    setDebugResults([...results]);
    
    setIsDebugging(false);
  };

  // Manual reset function for emergency cases
  const handleMicrophoneClick = async () => {
    console.log('🎤 Microphone button clicked. Current state:', { isRecording, isProcessing, processingMode });
    
    if (isRecording) {
      console.log('🛑 Stopping recording...');
      stopRecording();
    } else if (isProcessing) {
      console.log('🔄 Force resetting due to processing state...');
      resetRecordingState();
    } else {
      console.log('🎬 Starting recording...');
      
      // Cancel any pending LLM dispatch from previous session
      if (transcriptTimerRef.current) {
        clearTimeout(transcriptTimerRef.current);
        transcriptTimerRef.current = null;
      }

      // Directly start recording; user runs Audio Test manually if needed
      startRecording();
    }
  };

  // Emergency reset function
  const forceReset = () => {
    console.log('Force resetting all states...');
    resetRecordingState();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: colors.backgroundImage,
      backgroundPosition: colors.backgroundPosition,
      backgroundRepeat: colors.backgroundRepeat,
      backgroundAttachment: colors.backgroundAttachment,
      backgroundSize: 'cover',
      fontFamily: "'Merriweather', Georgia, serif",
      padding: '32px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'all 0.3s ease',
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'absolute', top: 50, right: 36, display: 'flex', gap: 12
      }}>
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          style={{
            width: 60, height: 60, borderRadius: '50%', background: colors.buttonBg,
            border: `3px solid ${colors.buttonBorder}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 2px 8px rgba(90,60,26,0.08)', cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.25)' : '#5a3c1a';
            e.currentTarget.firstChild.style.color = isDarkMode ? '#5a3c1a' : '#fffbe6';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = colors.buttonBg;
            e.currentTarget.firstChild.style.color = colors.textPrimary;
          }}
        >
          <span style={{ fontSize: 32, color: colors.textPrimary }}>
            {isDarkMode ? '☀️' : '🌙'}
          </span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            style={{
              width: 60, height: 60, borderRadius: '50%', background: colors.buttonBg,
              border: `3px solid ${colors.buttonBorder}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 2px 8px rgba(90,60,26,0.08)', cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ fontSize: 30, color: colors.textPrimary }}>🔔</span>
          </button>
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 14, height: 14,
              background: 'red', borderRadius: '50%', border: '2px solid white'
            }}></span>
          )}
          {showNotifications && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, background: colors.dropdownBg,
              borderRadius: 12, padding: '10px 0', boxShadow: '0 4px 16px rgba(90,60,26,0.15)',
              border: `1px solid ${colors.cardBorder}`, backdropFilter: 'blur(4px)', zIndex: 1000,
              minWidth: 280, marginTop: 8
            }}>
              {notifications.map((notif, index) => (
                <div key={index} style={{
                  padding: '12px 16px', borderBottom: index !== notifications.length - 1
                    ? `1px solid ${colors.cardBorder}` : 'none', color: colors.textPrimary,
                  fontSize: 15, fontWeight: 500, cursor: 'pointer'
                }}>
                  {notif}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings with Logout */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowLogout(true)}
          onMouseLeave={() => setShowLogout(false)}
        >
          <button style={{
            width: 60, height: 60, borderRadius: '50%', background: colors.buttonBg,
            border: `3px solid ${colors.buttonBorder}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 2px 8px rgba(90,60,26,0.08)', cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ fontSize: 36, color: colors.textPrimary }}>&#9881;</span>
          </button>
          {showLogout && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, background: colors.dropdownBg,
              borderRadius: 12, padding: '8px 0', border: `1px solid ${colors.cardBorder}`,
              boxShadow: '0 4px 16px rgba(90,60,26,0.15)', zIndex: 1000, minWidth: 120
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                  color: colors.textPrimary, fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Merriweather', Georgia, serif"
                }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <img src="/logo.png" alt="Bulbul Logo" style={{ width: 160, height: 240}} />
        </div>
      {/* Greeting */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 24, color: colors.textSecondary, opacity: 0.9 }}>Marhaba,</div>
        <div style={{ fontSize: 36, color: colors.textPrimary, fontWeight: 800 }}>John Doe</div>
      </div>
      {/* Progress Arc */}
      <div style={{ margin: '0 auto', marginBottom: 20, marginTop: 10, width: 220, height: 120, position: 'relative', zIndex: 2 }}>
        <svg width="220" height="120" viewBox="0 0 220 120">
          {/* Background arc */}
          <path
            d="M20,110 A90,90 0 0,1 200,110"
            fill="none"
            stroke={arcBgColor}
            strokeWidth={arcWidth}
            strokeLinecap="round"
            opacity="0.35"
          />
          {/* Foreground arc (progress) */}
          <path
            d="M20,110 A90,90 0 0,1 200,110"
            fill="none"
            stroke={arcColor}
            strokeWidth={arcWidth}
            strokeLinecap="round"
            strokeDasharray={arcCircumference}
            strokeDashoffset={arcCircumference * (1 - progress)}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: 50,
          left: 0,
          width: '100%',
          textAlign: 'center',
          color: colors.textPrimary,
        }}>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: 0.5 }}>2 hours</div>
          <div style={{ fontSize: 22, opacity: 0.7, marginTop: 2, fontWeight: 400 }}>spent learning</div>
        </div>
      </div>

      {/* Profile Image */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
        <img
          src="/profile-icon.jpeg"
          alt="Profile"
          style={{
            width: 100,
            height: 100,
            marginTop: 20,
            borderRadius: '50%',
            border: `3px solid ${colors.buttonBorder}`,
            objectFit: 'cover',
            background: '#fff',
          }}
        />
      </div>

      {/* Voice Recording Section */}
      <div style={{
        background: colors.cardBg,
        borderRadius: 24,
        padding: '32px 32px 28px 32px',
        maxWidth: 420,
        minWidth: 340,
        margin: '0 auto',
        boxShadow: '0 6px 24px rgba(90, 60, 26, 0.13)',
        marginTop: 18,
        marginBottom: 32,
        border: `1.5px solid ${colors.cardBorder}`,
        backdropFilter: 'blur(2px)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ fontSize: 32, color: colors.textPrimary, fontWeight: 800, marginBottom: 24, textAlign: 'center', letterSpacing: 0.5 }}>Voice Chat</div>
        
        {/* Audio Status Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: '8px 16px',
          backgroundColor: colors.cardBg,
          borderRadius: 20,
          border: `1px solid ${colors.cardBorder}`,
          opacity: 0.9
        }}>
          {/* Microphone Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: colors.textSecondary
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: audioContextRef.current ? '#27ae60' : '#95a5a6'
            }}></div>
            Microphone
          </div>

          {/* Connection Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: colors.textSecondary
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: websocketRef.current ? '#27ae60' : '#95a5a6'
            }}></div>
            {processingMode === 'realtime' ? 'Real-time' : 
             processingMode === 'file' ? 'File Mode' : 
             processingMode === 'direct' ? 'Direct Mode' : 'Ready'}
          </div>

          {/* Audio Level Indicator */}
          {isRecording && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 500,
              color: colors.textSecondary
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                animation: 'pulse 1s infinite'
              }}></div>
              Listening
            </div>
          )}
        </div>

        {/* Voice Wave Animation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-end', 
          gap: 4, 
          height: 48, 
          marginBottom: 24,
          padding: '8px 16px',
          backgroundColor: isRecording ? 'rgba(231, 76, 60, 0.1)' : 'rgba(62, 41, 18, 0.1)',
          borderRadius: 12,
          border: `1px solid ${isRecording ? 'rgba(231, 76, 60, 0.3)' : 'rgba(62, 41, 18, 0.3)'}`,
          transition: 'all 0.3s ease'
        }}>
          {audioLevels.map((level, index) => (
            <div
              key={index}
              style={{
                width: 6,
                height: isRecording ? Math.max(6, level * 40) : 20,
                backgroundColor: isRecording ? '#e74c3c' : waveColor,
                borderRadius: 3,
                transition: isRecording ? 'none' : 'height 0.3s ease',
                animation: !isRecording ? `waveAnim 2s ease-in-out ${index * 0.1}s infinite` : 'none',
                boxShadow: isRecording ? '0 2px 4px rgba(231, 76, 60, 0.3)' : 'none'
              }}
            />
          ))}
        </div>

        {/* Audio Quality Indicator */}
        {isRecording && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 500,
            color: colors.textSecondary
          }}>
            <div style={{
              display: 'flex',
              gap: 2
            }}>
              {[1, 2, 3, 4, 5].map(bar => (
                <div
                  key={bar}
                  style={{
                    width: 3,
                    height: 12,
                    backgroundColor: audioLevels.reduce((sum, level) => sum + level, 0) > bar * 0.2 ? '#27ae60' : '#ddd',
                    borderRadius: 1,
                    transition: 'background-color 0.2s ease'
                  }}
                />
              ))}
            </div>
            <span>Audio Quality</span>
          </div>
        )}

        {/* Status Text */}
        {isRecording && (
          <div style={{ 
            fontSize: 18, 
            color: '#e74c3c', 
            fontWeight: 600, 
            marginBottom: 16,
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#e74c3c',
              animation: 'pulse 1s infinite'
            }}></div>
            Recording... Speak now!
          </div>
        )}
        
        {isProcessing && (
          <div style={{ 
            fontSize: 18, 
            color: '#f39c12', 
            fontWeight: 600, 
            marginBottom: 16,
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}>
            <div style={{
              width: 12,
              height: 12,
              border: '2px solid #f39c12',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            {getProcessingModeText()}
          </div>
        )}

        {/* Accumulated Transcription Result */}
        {fullTranscription && (
          <div style={{ 
            fontSize: 16, 
            color: '#27ae60', 
            fontWeight: 500, 
            marginBottom: 16,
            padding: '16px 24px',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderRadius: 12,
            border: '1px solid rgba(39, 174, 96, 0.3)',
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(39, 174, 96, 0.1)'
          }}>
            <div style={{
              position: 'absolute',
              top: -6,
              left: 20,
              width: 12,
              height: 12,
              backgroundColor: '#27ae60',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: 6,
                height: 6,
                backgroundColor: 'white',
                borderRadius: '50%'
              }}></div>
            </div>
            "{fullTranscription}"
          </div>
        )}

        {/* Clear button */}
        {fullTranscription && !isRecording && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <button onClick={()=>{setFullTranscription(''); setTranscription('');}}
              style={{background:'none',border:'1px solid #e67e22',color:'#e67e22',padding:'6px 14px',borderRadius:14,cursor:'pointer',fontSize:12,fontFamily:"'Merriweather', Georgia, serif"}}>
              Clear Transcript
            </button>
          </div>
        )}

        {/* Quick Audio Test Button */}
        {!isRecording && !isProcessing && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 16
          }}>
            <button
              onClick={testAudio}
              style={{
                background: 'none',
                border: `1px solid ${colors.textSecondary}`,
                color: colors.textSecondary,
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Merriweather', Georgia, serif",
                transition: 'all 0.2s ease',
                opacity: 0.7
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.textSecondary;
                e.target.style.color = colors.cardBg;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = colors.textSecondary;
              }}
            >
              Test Audio
            </button>
            
            <button
              onClick={runDebugCheck}
              style={{
                background: 'none',
                border: `1px solid #e74c3c`,
                color: '#e74c3c',
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Merriweather', Georgia, serif",
                transition: 'all 0.2s ease',
                opacity: 0.7
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e74c3c';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#e74c3c';
              }}
            >
              Debug Info
            </button>
          </div>
        )}

        {/* Voice Control Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 28, 
          marginTop: 16 
        }}>
          {/* Cancel Button */}
          <button 
            onClick={stopRecording}
            disabled={!isRecording}
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              cursor: isRecording ? 'pointer' : 'default', 
              outline: 'none',
              opacity: isRecording ? 1 : 0.5
            }}
          >
            <svg width="36" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="#3a3632" />
              <path d="M12 12L24 24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M24 12L12 24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Microphone Button */}
          <button 
            onClick={handleMicrophoneClick}
            disabled={false} // Never disable the mic button completely
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              cursor: 'pointer', 
              outline: 'none',
              opacity: 1
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Mic body */}
              <path 
                d="M12 2C10.2 2 9 2.9 9 4 V12 C9 13.1 10.2 14 12 14 C13.8 14 15 13.1 15 12 V4 C15 2.9 13.8 2 12 2Z" 
                stroke={isRecording ? '#e74c3c' : micColor} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Mic stand */}
              <path 
                d="M19 10V12C19 15.31 16.31 18 13 18H11C7.69 18 5 15.31 5 12V10" 
                stroke={isRecording ? '#e74c3c' : micColor} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Base */}
              <line 
                x1="12" y1="20" x2="12" y2="24" 
                stroke={isRecording ? '#e74c3c' : micColor} 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
            </svg>
          </button>
          
          {/* Emergency Reset Button (small) */}
          {(isProcessing || transcription) && (
            <button 
              onClick={forceReset}
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: 0, 
                cursor: 'pointer', 
                outline: 'none',
                opacity: 0.6,
                marginLeft: 8
              }}
              title="Reset"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12Z" stroke="#666" strokeWidth="2"/>
                <path d="M12 8V12L15 15" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Test Results Modal */}
      {showTestResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: 24,
            padding: '32px',
            maxWidth: 500,
            minWidth: 400,
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 12px 48px rgba(90, 60, 26, 0.2)',
            border: `1.5px solid ${colors.cardBorder}`,
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <div style={{
                fontSize: 24,
                color: colors.textPrimary,
                fontWeight: 800,
                letterSpacing: 0.5
              }}>
                Audio Test Results
              </div>
              <button
                onClick={() => setShowTestResults(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: 8
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testResults.map((result, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: colors.personaBg,
                  border: `1px solid ${colors.cardBorder}`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    marginRight: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    backgroundColor: 
                      result.status === 'passed' ? '#2ecc71' :
                      result.status === 'failed' ? '#e74c3c' :
                      result.status === 'testing' ? '#f39c12' :
                      result.status === 'warning' ? '#f39c12' : '#3498db',
                    color: 'white'
                  }}>
                    {result.status === 'passed' ? '✓' :
                     result.status === 'failed' ? '✗' :
                     result.status === 'testing' ? '⟳' :
                     result.status === 'warning' ? '⚠' : 'i'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginBottom: 4
                    }}>
                      {result.test}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      lineHeight: 1.4
                    }}>
                      {result.message}
                    </div>
                  </div>
                  {result.status === 'testing' && (
                    <div style={{
                      width: 16,
                      height: 16,
                      marginLeft: 8,
                      border: '2px solid #f39c12',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                </div>
              ))}
            </div>
            
            {isTestingAudio && (
              <div style={{
                marginTop: 20,
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: 14
              }}>
                Testing in progress...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Results Modal */}
      {showDebugResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: 24,
            padding: '32px',
            maxWidth: 500,
            minWidth: 400,
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 12px 48px rgba(90, 60, 26, 0.2)',
            border: `1.5px solid ${colors.cardBorder}`,
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <div style={{
                fontSize: 24,
                color: colors.textPrimary,
                fontWeight: 800,
                letterSpacing: 0.5
              }}>
                Debug Information
              </div>
              <button
                onClick={() => setShowDebugResults(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: 8
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {debugResults.map((result, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: colors.personaBg,
                  border: `1px solid ${colors.cardBorder}`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    marginRight: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    backgroundColor: 
                      result.status === 'passed' ? '#2ecc71' :
                      result.status === 'failed' ? '#e74c3c' :
                      result.status === 'testing' ? '#f39c12' :
                      result.status === 'info' ? '#3498db' : '#95a5a6',
                    color: 'white'
                  }}>
                    {result.status === 'passed' ? '✓' :
                     result.status === 'failed' ? '✗' :
                     result.status === 'testing' ? '⟳' :
                     result.status === 'info' ? 'i' : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginBottom: 4
                    }}>
                      {result.test}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      lineHeight: 1.4
                    }}>
                      {result.message}
                    </div>
                  </div>
                  {result.status === 'testing' && (
                    <div style={{
                      width: 16,
                      height: 16,
                      marginLeft: 8,
                      border: '2px solid #f39c12',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                </div>
              ))}
            </div>
            
            {isDebugging && (
              <div style={{
                marginTop: 20,
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: 14
              }}>
                Debugging in progress...
              </div>
            )}
          </div>
        </div>
      )}

      {/* LLM Response */}
      {llmResponse && (
        <div style={{
          background: colors.cardBg,
          borderRadius: 24,
          padding: '32px 32px 28px 32px',
          maxWidth: 420,
          minWidth: 340,
          margin: '0 auto',
          boxShadow: '0 6px 24px rgba(90, 60, 26, 0.13)',
          marginTop: 18,
          marginBottom: 32,
          border: `1.5px solid ${colors.cardBorder}`,
          backdropFilter: 'blur(2px)',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ 
            fontSize: 32, 
            color: colors.textPrimary, 
            fontWeight: 800, 
            marginBottom: 24, 
            textAlign: 'center', 
            letterSpacing: 0.5 
          }}>
            Bulbul's Response
          </div>
          <div style={{
            background: colors.personaBg,
            borderRadius: 16,
            padding: '20px 24px',
            color: colors.textPrimary,
            boxShadow: '0 2px 8px rgba(90,60,26,0.07)',
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.6,
            border: `1px solid ${colors.cardBorder}`,
            textAlign: 'left',
          }}>
           <ReactMarkdown
        children={llmresult}
        components={{
          strong: ({ node, ...props }) => (
            <strong style={{ fontWeight: 700 }}>{props.children}</strong>
          ),
          p: ({ node, ...props }) => <p style={{
            margin: 0,
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.6,
            textAlign: 'left',
            color: colors.textPrimary,
          }}>{props.children}</p>
        }}
      />
          </div>
        </div>
      )}

      {/* Tutor Persona */}
      <div style={{
        background: colors.cardBg,
        borderRadius: 24,
        padding: '32px 32px 28px 32px',
        maxWidth: 420,
        minWidth: 340,
        margin: '0 auto',
        boxShadow: '0 6px 24px rgba(90, 60, 26, 0.13)',
        marginTop: 18,
        marginBottom: 32,
        border: `1.5px solid ${colors.cardBorder}`,
        backdropFilter: 'blur(2px)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ fontSize: 32, color: colors.textPrimary, fontWeight: 800, marginBottom: 24, textAlign: 'center', letterSpacing: 0.5 }}>Tutor Persona</div>
        {[
          { name: 'Ustadha Laila', desc: 'Calm, nurturing, and encouraging tone' },
          { name: 'Ustadh Hakeem', desc: 'Upbeat, casual, warm' },
          { name: 'Bulbul', desc: 'Playful, expressive, chirpy.' },
          { name: 'Rakkan', desc: 'Smooth, energetic' }
        ].map((persona, index) => (
          <div key={index} style={{
            background: colors.personaBg,
            borderRadius: 16,
            padding: '18px 20px',
            marginBottom: 16,
            color: colors.textPrimary,
            boxShadow: '0 2px 8px rgba(90,60,26,0.07)',
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.2,
            border: `1px solid ${colors.cardBorder}`,
            transition: 'all 0.3s ease',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{persona.name}</div>
            <div style={{ fontSize: 15, opacity: 0.8, fontWeight: 400 }}>{persona.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );  
};

export default PersonalDashboard;
