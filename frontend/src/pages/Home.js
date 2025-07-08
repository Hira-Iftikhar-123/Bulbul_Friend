import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const translations = {
  en: {
    greeting: 'Hi, I am Bulbul, ',
    help: 'How can I help you?',
    tagline: "Let's learn Arabic together, step by step.",
    login: 'Login',
    signup: 'Signup',
    language: 'Language',
  },
  ar: {
    greeting: 'مرحباً، أنا بلبل',
    help: 'كيف يمكنني مساعدتك؟',
    tagline: 'هيا نتعلم العربية معاً، خطوة بخطوة.',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    language: 'اللغة',
  }
};

const Home = () => {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  return (
    <div style={{
      marginTop: -30,
      minHeight: '100vh',
      background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative'
    }}>
      {/* Language Switcher */}
      <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}>
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          style={{
            fontSize: 18,
            padding: '6px 16px',
            borderRadius: 18,
            border: '1.5px solid #5a3c1a',
            background: 'rgba(255,255,255,0.7)',
            color: '#5a3c1a',
            marginTop: 50,
            fontWeight: 700,
            fontFamily: "'Merriweather', Georgia, serif",
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '24px 32px 0 32px', position: 'relative' }}>
        {/* Logo */}
        <img src="/logo.png" alt="Bulbul Logo" style={{ width: 160, height: 240}} />
       
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: "'Merriweather', Georgia, serif" }}>
        <div style={{ marginTop: -10, textAlign: 'center', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          <div style={{ fontSize: 32, color: '#5a3c1a', fontWeight: 400, marginBottom: 8, letterSpacing: 0.5 }}>{t.greeting}</div>
          <div style={{ fontSize: 48, color: '#3e2912', fontWeight: 900, marginBottom: 32, letterSpacing: 1, lineHeight: 1.1 }}>
            {t.help}
          </div>

          <div style={{ fontSize: 26, color: '#4A2C2A', fontWeight: 400, marginBottom: 40, fontStyle: 'italic', opacity: 0.7, fontFamily: "'Merriweather', Georgia, serif" }}>
            {t.tagline}
          </div>
        </div>
        {/* Login/Signup Buttons Centered Below */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, margin: '32px auto 0 auto', width: '100%' }}>
          <Link
            to="/auth?mode=login"
            style={{
              minWidth: 120,
              padding: '0.7rem 2.2rem',
              fontSize: 22,
              fontWeight: 700,
              color: '#5a3c1a',
              background: 'rgba(255,255,255,0.18)',
              border: '2px solid #5a3c1a',
              borderRadius: 30,
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(90,60,26,0.08)',
              transition: 'background 0.2s, color 0.2s, border 0.2s',
              fontFamily: "'Merriweather', Georgia, serif"
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#5a3c1a'; e.currentTarget.style.color = '#fffbe6'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#5a3c1a'; }}
          >
            {t.login}
          </Link>
          <Link
            to="/auth?mode=signup"
            style={{
              minWidth: 120,
              padding: '0.7rem 2.2rem',
              fontSize: 22,
              fontWeight: 700,
              color: '#5a3c1a',
              background: 'rgba(255,255,255,0.18)',
              border: '2px solid #5a3c1a',
              borderRadius: 30,
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(90,60,26,0.08)',
              transition: 'background 0.2s, color 0.2s, border 0.2s',
              fontFamily: "'Merriweather', Georgia, serif"
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#5a3c1a'; e.currentTarget.style.color = '#fffbe6'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#5a3c1a'; }}
          >
            {t.signup}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 