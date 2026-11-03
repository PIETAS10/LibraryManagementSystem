
import React from "react";

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <div className="dashboard-content settings-page">
      <div className="welcome-section">
        <div>
          <h2>Cài đặt hệ thống</h2>
          <p>Tùy chỉnh giao diện sử dụng hệ thống thư viện.</p>
        </div>
      </div>

      <div className="content-card settings-card">
        <div className="card-heading">
          <div>
            <h5>Giao diện</h5>
            <p>Tùy chỉnh chế độ hiển thị của hệ thống.</p>
          </div>
          <i className="bi bi-palette settings-heading-icon"></i>
        </div>

        <div className="settings-option">
          <div className="settings-option-info">
            <div className="settings-option-icon">
              <i className={`bi ${darkMode ? "bi-moon-stars" : "bi-sun"}`}></i>
            </div>

            <div>
              <strong>Chế độ tối</strong>
              <p>
                {darkMode
                  ? "Đang sử dụng giao diện tối."
                  : "Đang sử dụng giao diện sáng."}
              </p>
            </div>
          </div>

          <label className="theme-switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={onToggleDarkMode}
              aria-label="Bật hoặc tắt chế độ tối"
            />
            <span className="theme-switch-slider"></span>
          </label>
        </div>

        <div className="settings-note">
          <i className="bi bi-info-circle"></i>
          <span>
            Lựa chọn giao diện sẽ được lưu tự động và giữ nguyên
            khi bạn đăng nhập lại hoặc tải lại trang.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
