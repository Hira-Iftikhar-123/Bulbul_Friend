import React, { useState, useEffect, useRef } from 'react';

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
  const [notifications, setNotifications] = useState([
    "Your lesson with Bulbul tutor is tomorrow at 10am",
    "New quiz unlocked in Module 3",
  ]);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(10).fill(0));
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Initialize audio context and analyzer
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to use voice recording.');
      return null;
    }
  };

  // Update audio levels for wave animation
  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average levels for visualization
    const levels = [];
    const chunkSize = Math.floor(dataArray.length / 10);
    
    for (let i = 0; i < 10; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = dataArray.slice(start, end);
      const average = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
      levels.push(Math.min(average / 128, 1)); // Normalize to 0-1
    }
    
    setAudioLevels(levels);
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await initializeAudio();
      if (!stream) return;

      setIsRecording(true);
      setTranscription('');
      setIsProcessing(false);

      // Start audio level monitoring
      updateAudioLevels();

      // Create MediaRecorder for audio capture
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        // Try file upload first, fallback to direct recording
        try {
          await transcribeAudio(audioBlob);
        } catch (error) {
          console.log('File upload failed, trying direct recording...');
          await transcribeDirectRecording();
        }
      };

      mediaRecorderRef.current.start();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Transcribe audio using direct recording endpoint
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);

      // Upload the audio blob to the backend
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await fetch('http://localhost:8000/api/transcribe-voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // fallback to direct recording endpoint
        console.log('File upload failed, trying direct recording...');
        await transcribeDirectRecording();
        return;
      }

      const result = await response.json();
      if (!result.transcription.trim()) {
        setTranscription('Sorry, to get an answer you should say something!');
        return;
      }
      setTranscription(result.transcription);
      await sendToChat(result.transcription, result.language);

    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscription('Error transcribing audio. Please try again.');
    } finally {
      setIsProcessing(false);
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
        // You can display the chat response here or navigate to chat page
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
      await sendToChat(result.transcription, result.language);
      
    } catch (error) {
      console.error('Error with direct recording:', error);
      setTranscription('Error transcribing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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
        
        {/* Voice Wave Animation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-end', 
          gap: 4, 
          height: 32, 
          marginBottom: 24 
        }}>
          {audioLevels.map((level, index) => (
            <div
              key={index}
              style={{
                width: 4,
                height: isRecording ? Math.max(4, level * 32) : 16,
                backgroundColor: isRecording ? '#e74c3c' : waveColor,
                borderRadius: 2,
                transition: isRecording ? 'none' : 'height 0.3s ease',
                animation: !isRecording ? `waveAnim 2s ease-in-out ${index * 0.1}s infinite` : 'none',
              }}
            />
          ))}
        </div>

        {/* Status Text */}
        {isRecording && (
          <div style={{ 
            fontSize: 18, 
            color: '#e74c3c', 
            fontWeight: 600, 
            marginBottom: 16,
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center'
          }}>
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
            textAlign: 'center'
          }}>
            Processing your voice...
          </div>
        )}

        {/* Transcription Result */}
        {transcription && !isRecording && !isProcessing && (
          <div style={{ 
            fontSize: 16, 
            color: '#27ae60', 
            fontWeight: 500, 
            marginBottom: 16,
            padding: '12px 20px',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(39, 174, 96, 0.3)',
            fontFamily: "'Merriweather', Georgia, serif",
            textAlign: 'center'
          }}>
            "{transcription}"
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
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              cursor: isProcessing ? 'default' : 'pointer', 
              outline: 'none',
              opacity: isProcessing ? 0.5 : 1
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
        </div>
      </div>

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
