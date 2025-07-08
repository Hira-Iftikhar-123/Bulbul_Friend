import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const getMode = (search) => {
  const params = new URLSearchParams(search);
  return params.get('mode') === 'signup' ? 'signup' : 'login';
};

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const mode = getMode(location.search);
  const isLogin = mode === 'login';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      navigate('/dashboard');
    } else {
      if (!isLogin && form.password !== form.confirm) {
        alert("Passwords do not match!");
        return;
      }      
      navigate('/auth?mode=login');
    }
  };

  const switchMode = () => {
    navigate(`/auth?mode=${isLogin ? 'signup' : 'login'}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url(/Wallpaper_Bulbul.jpeg) no-repeat center center fixed',
      backgroundSize: 'cover',
      fontFamily: 'serif',
      position: 'relative'
    }}>
      {/* Top Left Logo */}
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <img src="/logo.png" alt="Bulbul Logo" style={{ width: 160, height: 240}} />
        </div>

<div style={{
  background: 'rgba(255, 255, 255, 0.30)',
  borderRadius: 24,
  padding: '32px 32px 28px 32px',
  maxWidth: 420,
  minWidth: 340,
  margin: '0 auto',
  boxShadow: '0 6px 24px rgba(90, 60, 26, 0.13)',
  marginTop: 18,
  marginBottom: 32,
  border: '1.5px solid #e2cdb2',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 48, color: '#3e2912', fontWeight: 900, marginBottom: 32, letterSpacing: 1, lineHeight: 1.1 }}>Welcome!</h3>
          <div style={{ fontSize: 26, color: '#7c6242', fontWeight: 400, marginBottom: 40, fontStyle: 'italic', opacity: 0.7, fontFamily: "'Merriweather', Georgia, serif" }}>{isLogin ? 'Login' : 'Signup'} to continue.</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16, marginTop: -10 }}>
            <label style={{ fontSize: 16, color: '#7c6242', fontWeight: 600, letterSpacing: 1 }}>EMAIL</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="hello@reallygreatsite.com"
              style={{ width: '100%', padding: '10px 16px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 15 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 16, color: '#7c6242', fontWeight: 600, letterSpacing: 1 }}>PASSWORD</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="*****"
              style={{ width: '100%', padding: '10px 16px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 15 }}
            />
          </div>
          {!isLogin && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 16, color: '#7c6242', fontWeight: 600, letterSpacing: 1 }}>CONFIRM PASSWORD</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                required
                placeholder="*****"
                style={{ width: '100%', padding: '10px 16px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 15 }}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
  <button
    type="submit"
    style={{
      background: 'rgba(255,255,255,0.18)',
      border: '2px solid #5a3c1a',
      color: '#5a3c1a',
      borderRadius: 30,
      padding: '0.5rem 1.6rem',
      fontSize: 18,
      fontWeight: 700,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'background 0.2s, color 0.2s, border 0.2s',
      fontFamily: "'Merriweather', Georgia, serif"
    }}
    onMouseOver={e => {
      e.currentTarget.style.background = '#5a3c1a';
      e.currentTarget.style.color = '#fffbe6';
    }}
    onMouseOut={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
      e.currentTarget.style.color = '#5a3c1a';
    }}
  >
    {isLogin ? 'Login' : 'Signup'}
  </button>
</div>


        </form>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ fontSize: 20, color: '#7c6242', fontWeight: 400, marginBottom: 40, fontStyle: 'italic', opacity: 0.7, fontFamily: "'Merriweather', Georgia, serif" }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} style={{ background: 'none', border: 'none', color: '#5a3c1a', textDecoration: 'underline', cursor: 'pointer', fontSize: 20, fontWeight: 700 }}
               onMouseOver={e => { e.currentTarget.style.background = '#5a3c1a'; e.currentTarget.style.color = '#fffbe6'; }}
               onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#5a3c1a'; }}
             >
              {isLogin ? 'Signup' : 'Login'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth; 