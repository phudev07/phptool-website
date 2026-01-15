import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAntiSpam } from '../hooks/useAntiSpam';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Anti-spam protection: 5 attempts per minute, 5 min cooldown
  const { validateSubmission, recordAttempt, HoneypotField } = useAntiSpam({
    maxAttempts: 5,
    windowMs: 60000,
    cooldownMs: 300000
  });

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Anti-spam validation
    const spamCheck = validateSubmission();
    if (!spamCheck.valid) {
      setError(spamCheck.error);
      return;
    }
    recordAttempt();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Tài khoản không tồn tại');
      } else if (err.code === 'auth/wrong-password') {
        setError('Mật khẩu không đúng');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không đúng');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại!');
      }
    }

    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    
    if (!email) {
      return setError('Vui lòng nhập email!');
    }
    
    // Anti-spam validation
    const spamCheck = validateSubmission();
    if (!spamCheck.valid) {
      setError(spamCheck.error);
      return;
    }
    recordAttempt();

    try {
      setError('');
      setMessage('');
      setLoading(true);
      
      // Send password reset email - Firebase will only send if email exists
      await sendPasswordResetEmail(auth, email);
      setMessage('Nếu email này đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong hộp thư.');
      setForgotMode(false);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('Email này chưa đăng ký tài khoản!');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều yêu cầu! Vui lòng thử lại sau.');
      } else {
        setError('Gửi email thất bại. Vui lòng thử lại!');
      }
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">{forgotMode ? '🔑' : '🔐'}</div>
            <h1>{forgotMode ? 'Quên Mật Khẩu' : 'Đăng Nhập'}</h1>
            <p>{forgotMode ? 'Nhập email để nhận link đặt lại mật khẩu' : 'Chào mừng bạn quay trở lại!'}</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  'Gửi Email Đặt Lại'
                )}
              </button>

              <button 
                type="button" 
                className="btn-text" 
                onClick={() => { setForgotMode(false); setError(''); }}
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button 
                type="button" 
                className="btn-forgot" 
                onClick={() => { setForgotMode(true); setError(''); setMessage(''); }}
              >
                Quên mật khẩu?
              </button>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  'Đăng Nhập'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="auth-link">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>
    </div>
  );
}
