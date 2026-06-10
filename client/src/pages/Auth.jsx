/*
  Auth.jsx — Login & Register Page Component
  
  Key React concepts used here:
  
  1. useState — stores values that change over time
     Example: const [tab, setTab] = useState('login')
     → "tab" holds 'login' or 'register'
     → setTab('register') changes it → React re-renders the UI
  
  2. useNavigate — for going to a different page
  
  3. Controlled inputs — input values are stored in state
     → Every keystroke updates the state
     → State drives what's shown in the input
*/
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AtSign, Lock, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, Shield, Ban } from 'lucide-react';
import './Auth.css';

// Server URL — where our Node.js backend is running
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Auth() {
  // useSearchParams reads the URL: ?mode=login or ?mode=register
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // STATE — React's memory for this component
  const [tab, setTab] = useState(searchParams.get('mode') || 'login');

  // Login form state
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register form state
  const [regData, setRegData] = useState({ displayName: '', username: '', password: '', confirm: '' });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [pwdStrength, setPwdStrength] = useState({ width: '0%', color: 'transparent', label: 'Enter a password' });

  /* ── PASSWORD STRENGTH CALCULATOR ── */
  function calcStrength(pwd) {
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { width:'0%',   color:'transparent', label:'Enter a password' },
      { width:'20%',  color:'#ef4444',     label:'Very weak' },
      { width:'40%',  color:'#f59e0b',     label:'Weak' },
      { width:'60%',  color:'#eab308',     label:'Medium' },
      { width:'80%',  color:'#22c55e',     label:'Strong' },
      { width:'100%', color:'#00c9a7',     label:'Very strong! 💪' },
    ];
    return pwd.length === 0 ? levels[0] : levels[Math.min(score + 1, 5)];
  }

  /* ── HANDLE LOGIN ── */
  async function handleLogin(e) {
    e.preventDefault(); // Stop page from refreshing
    setLoginError('');
    setLoginLoading(true);

    try {
      // Send POST request to our Node.js server
      // async/await means "wait for the server to respond before continuing"
      const res = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData) // Convert JS object → JSON text
      });

      const data = await res.json(); // Convert response → JS object

      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }

      // Save user to localStorage (browser storage)
      localStorage.setItem('safetalk_user', JSON.stringify(data.user));
      navigate('/app'); // Go to chat app
    } catch {
      setLoginError('Cannot connect to server. Make sure the server is running!');
    } finally {
      setLoginLoading(false);
    }
  }

  /* ── HANDLE REGISTER ── */
  async function handleRegister(e) {
    e.preventDefault();
    setRegError('');

    // Client-side validation (quick checks before hitting the server)
    if (!/^[a-z0-9_]{3,20}$/.test(regData.username)) {
      return setRegError('Username: 3-20 chars, lowercase letters/numbers/underscores only.');
    }
    if (regData.password.length < 6) return setRegError('Password must be at least 6 characters.');
    if (regData.password !== regData.confirm) return setRegError('Passwords do not match.');

    setRegLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regData.username,
          displayName: regData.displayName,
          password: regData.password
        })
      });

      const data = await res.json();
      if (!res.ok) return setRegError(data.error || 'Registration failed');

      localStorage.setItem('safetalk_user', JSON.stringify(data.user));
      navigate('/app');
    } catch {
      setRegError('Cannot connect to server. Make sure the server is running!');
    } finally {
      setRegLoading(false);
    }
  }

  /* ── RENDER ── */
  return (
    <div className="auth-page">
      {/* Decorative blobs */}
      <div className="auth-bg">
        <div className="auth-blob-1"></div>
        <div className="auth-blob-2"></div>
      </div>

      {/* Back link */}
      <button className="back-link" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back to SafeTalk
      </button>

      <main className="auth-main">
        <div className="auth-card">

          {/* Logo */}
          <div className="auth-logo">
            <div className="logo-icon"><ShieldCheck size={20} /></div>
            <span className="logo-text">Safe<span className="text-accent">Talk</span></span>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Log In</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
            <div className={`tab-indicator ${tab === 'register' ? 'right' : ''}`}></div>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-header">
                <h1 className="form-title">Welcome back!</h1>
                <p className="form-subtitle">Enter your username and password to continue.</p>
              </div>

              <div className="form-group">
                <label className="form-label"><AtSign size={14} /> Username</label>
                <input
                  type="text" className="input-field" placeholder="Enter your username"
                  value={loginData.username}
                  // onChange updates state every time user types a character
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label"><Lock size={14} /> Password</label>
                <div className="input-wrapper">
                  <input
                    type={showLoginPwd ? 'text' : 'password'} className="input-field" placeholder="Enter your password"
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowLoginPwd(v => !v)}>
                    {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {loginError && <div className="form-error">{loginError}</div>}

              <button type="submit" className="btn btn-primary w-full" disabled={loginLoading}>
                <LogIn size={18} /> {loginLoading ? 'Logging in...' : 'Log In'}
              </button>

              <p className="form-switch">
                Don't have an account?{' '}
                <button type="button" className="form-switch-link" onClick={() => setTab('register')}>Create one →</button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-header">
                <h1 className="form-title">Join SafeTalk</h1>
                <p className="form-subtitle">Create a private account. No phone number needed.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input type="text" className="input-field" placeholder="What should people call you?"
                  value={regData.displayName}
                  onChange={e => setRegData({ ...regData, displayName: e.target.value })}
                  maxLength={30} required />
              </div>

              <div className="form-group">
                <label className="form-label"><AtSign size={14} /> Username</label>
                <div className="input-wrapper">
                  <span className="input-prefix">@</span>
                  <input type="text" className="input-field input-prefixed" placeholder="choose_a_username"
                    value={regData.username}
                    onChange={e => setRegData({ ...regData, username: e.target.value.toLowerCase() })}
                    pattern="[a-z0-9_]{3,20}" required />
                </div>
                <small className="form-hint">3–20 chars: lowercase letters, numbers, underscores</small>
              </div>

              <div className="form-group">
                <label className="form-label"><Lock size={14} /> Password</label>
                <div className="input-wrapper">
                  <input type={showRegPwd ? 'text' : 'password'} className="input-field" placeholder="Choose a strong password"
                    value={regData.password} minLength={6}
                    onChange={e => { setRegData({ ...regData, password: e.target.value }); setPwdStrength(calcStrength(e.target.value)); }}
                    required />
                  <button type="button" className="eye-btn" onClick={() => setShowRegPwd(v => !v)}>
                    {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="pwd-strength">
                  <div className="strength-bar"><div className="strength-fill" style={{ width: pwdStrength.width, background: pwdStrength.color }}></div></div>
                  <span className="strength-label" style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="input-field" placeholder="Repeat your password"
                  value={regData.confirm}
                  onChange={e => setRegData({ ...regData, confirm: e.target.value })}
                  required />
              </div>

              <div className="privacy-note">
                <Shield size={16} />
                <span>No email or phone required. Your data stays private.</span>
              </div>

              {regError && <div className="form-error">{regError}</div>}

              <button type="submit" className="btn btn-primary w-full" disabled={regLoading}>
                <UserPlus size={18} /> {regLoading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="form-switch">
                Already have an account?{' '}
                <button type="button" className="form-switch-link" onClick={() => setTab('login')}>Log in →</button>
              </p>
            </form>
          )}
        </div>

        {/* Trust badges */}
        <div className="auth-trust">
          {[['🔒','Encrypted'],['🚫','No Ads'],['👁️','No Tracking']].map(([icon,label]) => (
            <div key={label} className="trust-item"><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
      </main>
    </div>
  );
}
