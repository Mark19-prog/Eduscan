import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('userRole', 'admin');
      navigate('/dashboard');
    } else if (username === 'teacher' && password === 'teacher123') {
      localStorage.setItem('userRole', 'teacher');
      navigate('/teacher');
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '24px'
    }}>
      <div className="card animate-fade-in" style={{
        display: 'flex',
        width: '100%',
        maxWidth: '900px',
        padding: 0,
        overflow: 'hidden',
        minHeight: '500px'
      }}>

        {/* Left Side: Branding / Visual */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(135deg, var(--accent-light), #d0ebff)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative'
        }}>
          <img
            src="/logo.png"
            alt="San Jose National High School Logo"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              marginBottom: '24px'
            }}
          />
          <h1 style={{ fontSize: '42px', letterSpacing: '-1px', marginBottom: '16px' }}>EduScan.</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1.4, maxWidth: '300px' }}>
            Automated Biometric Attendance & Grade Management System.
          </p>
          <div style={{ marginTop: 'auto' }}>
            <span className="tag tag-blue">San Jose National High School</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{
          flex: 1,
          padding: '64px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Please enter your administrative credentials.</p>
          
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '32px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Demo Credentials:</strong>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ display: 'block' }}>Admin: <strong>admin</strong> / <strong>admin123</strong></span>
              </div>
              <div>
                <span style={{ display: 'block' }}>Teacher: <strong>teacher</strong> / <strong>teacher123</strong></span>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '12px', background: '#ffe3e3', color: 'var(--danger)', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Enter your username" className="input-field" style={{ paddingLeft: '44px' }} value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="password" placeholder="••••••••" className="input-field" style={{ paddingLeft: '44px' }} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
              Login to Dashboard
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
