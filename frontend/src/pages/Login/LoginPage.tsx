import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

interface LoginPageProps {
  onRegister?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onRegister }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-decoration decoration-one"></div>
        <div className="login-decoration decoration-two"></div>
      </div>

      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">
            <i className="bi bi-book-half"></i>
          </div>

          <h1>PTIT Library</h1>
          <p>HỆ THỐNG QUẢN LÝ THƯ VIỆN</p>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <h2>Đăng nhập</h2>
            <p>Đăng nhập để tiếp tục sử dụng hệ thống</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="email">Địa chỉ email</label>

              <div className="login-input-wrapper">
                <i className="bi bi-envelope"></i>
                <input
                  id="email"
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="password">Mật khẩu</label>

              <div className="login-input-wrapper">
                <i className="bi bi-lock"></i>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={submitting}
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                  }
                >
                  <i
                    className={
                      showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'
                    }
                  ></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <i className="bi bi-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="login-register">
            <span>Chưa có tài khoản?</span>{' '}
            <button
              type="button"
              onClick={onRegister}
              disabled={!onRegister || submitting}
            >
              Đăng ký tài khoản độc giả
            </button>
          </div>

          <div className="login-security">
            <i className="bi bi-shield-lock"></i>
            <span>Đăng nhập an toàn và bảo mật</span>
          </div>
        </div>

        <div className="login-footer">
          © {new Date().getFullYear()} PTIT Library Management System
        </div>
      </div>
    </div>
  );
};

export default LoginPage;