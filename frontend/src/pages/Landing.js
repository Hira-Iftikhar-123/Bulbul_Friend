import React, { useEffect, useState } from 'react';
import Home from './Home';

const Landing = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
          backgroundSize: 'cover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#5a3c1a',
          fontFamily: "'Merriweather', Georgia, serif",
          animation: 'fadeIn 1.2s',
        }}
      >
        <img src="/logo.png" alt="Bulbul Logo" style={{ width: 280, height: 380, marginBottom: 24 }} />
        <div style={{ fontSize: 48, color: '#3e2912', fontWeight: 900, marginBottom: 32, letterSpacing: 1, lineHeight: 1.1 }}>
          Welcome to Bulbul Friend
        </div>
        <div style={{ fontSize: 26, color: '#4A2C2A', fontWeight: 400, marginBottom: 40, fontStyle: 'italic', opacity: 0.7, fontFamily: "'Merriweather', Georgia, serif" }}>
          Your tutor for Arabic mastery
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return <Home />;
};

export default Landing;
