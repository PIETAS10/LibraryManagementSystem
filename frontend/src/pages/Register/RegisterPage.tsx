
import React, { useState } from 'react';
import {
  registerReaderApi,
  type RegisterReaderData,
} from '../../services/auth.service';
import './RegisterPage.css';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({
  onBackToLogin,
}) => {
  const [formData, setFormData] = useState<RegisterReaderData>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (
      !formData.full_name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirm_password
    ) {
      setError('Vui lòng nhập đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setSubmitting(true);

      const message = await registerReaderApi({
        ...formData,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim(),
        address: formData.address?.trim(),
      });

      setSuccess(
        message ||
          'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt.',
      );

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng ký thất bại. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-background">
        <div className="register-decoration register-decoration-one"></div>
        <div className="register-decoration register-decoration-two"></div>
      </div>

      <div className="register-container">
        <div className="register-brand">
          <div className="register-logo">
            <i className="bi bi-book-half"></i>
          </div>

          <h1>PTIT Library</h1>
          <p>HỆ THỐNG QUẢN LÝ THƯ VIỆN</p>
        </div>

        <div className="register-card">
          <div className="register-heading">
            <h2>Đăng ký độc giả</h2>
            <p>Tạo tài khoản để sử dụng dịch vụ thư viện</p>
          </div>

          {success ? (
            <div className="register-success">
              <div className="register-success-icon">
                <i className="bi bi-check-circle-fill"></i>
              </div>

              <h3>Đăng ký thành công!</h3>
              <p>{success}</p>

              <div className="register-pending">
                <i className="bi bi-clock-history"></i>
                <span>
                  Vui lòng chờ Admin hoặc Thủ thư phê duyệt tài khoản
                  trước khi đăng nhập.
                </span>
              </div>

              <button
                type="button"
                className="register-submit"
                onClick={onBackToLogin}
              >
                Quay lại đăng nhập
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="register-form-grid">
                <div className="register-form-group register-full-width">
                  <label htmlFor="full_name">
                    Họ và tên <span>*</span>
                  </label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-person"></i>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="Nhập họ và tên"
                      value={formData.full_name}
                      onChange={handleChange}
                      autoComplete="name"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="register-form-group register-full-width">
                  <label htmlFor="email">
                    Địa chỉ email <span>*</span>
                  </label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-envelope"></i>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="register-form-group">
                  <label htmlFor="phone">Số điện thoại</label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-telephone"></i>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Nhập số điện thoại"
                      value={formData.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="register-form-group">
                  <label htmlFor="address">Địa chỉ</label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-geo-alt"></i>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Nhập địa chỉ"
                      value={formData.address}
                      onChange={handleChange}
                      autoComplete="street-address"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="register-form-group">
                  <label htmlFor="password">
                    Mật khẩu <span>*</span>
                  </label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-lock"></i>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 8 ký tự"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      disabled={submitting}
                    />

                    <button
                      type="button"
                      className="register-password-toggle"
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

                <div className="register-form-group">
                  <label htmlFor="confirm_password">
                    Xác nhận mật khẩu <span>*</span>
                  </label>

                  <div className="register-input-wrapper">
                    <i className="bi bi-shield-lock"></i>
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      disabled={submitting}
                    />

                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Ẩn mật khẩu'
                          : 'Hiện mật khẩu'
                      }
                    >
                      <i
                        className={
                          showConfirmPassword
                            ? 'bi bi-eye-slash'
                            : 'bi bi-eye'
                        }
                      ></i>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="register-error">
                  <i className="bi bi-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}

              <button
                className="register-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    Đang đăng ký...
                  </>
                ) : (
                  <>
                    Tạo tài khoản
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="register-login">
              <span>Đã có tài khoản?</span>{' '}
              <button
                type="button"
                onClick={onBackToLogin}
                disabled={submitting}
              >
                Đăng nhập
              </button>
            </div>
          )}

          <div className="register-security">
            <i className="bi bi-shield-lock"></i>
            <span>Thông tin tài khoản được bảo mật</span>
          </div>
        </div>

        <div className="register-footer">
          © {new Date().getFullYear()} PTIT Library Management System
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
