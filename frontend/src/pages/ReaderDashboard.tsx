
import React from "react";
import { useAuth } from "../context/AuthContext";

const ReaderDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div>
          <h2>Không gian độc giả</h2>
          <p>
            Xin chào {user?.full_name}! Chào mừng bạn đến với PTIT Library.
          </p>
        </div>

        <div className="current-date">
          <i className="bi bi-calendar3"></i>
          {new Date().toLocaleDateString("vi-VN")}
        </div>
      </section>

      <section className="statistics-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Thông tin tài khoản</span>
            <div className="stat-icon red">
              <i className="bi bi-person-circle"></i>
            </div>
          </div>
          <h3>Độc giả</h3>
          <p>Vai trò hiện tại</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Tra cứu sách</span>
            <div className="stat-icon green">
              <i className="bi bi-search"></i>
            </div>
          </div>
          <h3>Danh mục</h3>
          <p>Tìm kiếm đầu sách trong thư viện</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Quy trình mượn</span>
            <div className="stat-icon orange">
              <i className="bi bi-book"></i>
            </div>
          </div>
          <h3>Tại quầy</h3>
          <p>Liên hệ thủ thư để mượn sách</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Hỗ trợ</span>
            <div className="stat-icon blue">
              <i className="bi bi-headset"></i>
            </div>
          </div>
          <h3>Thư viện</h3>
          <p>Liên hệ nhân viên khi cần hỗ trợ</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="content-card activity-card">
          <div className="card-heading">
            <div>
              <h5>Hướng dẫn mượn sách</h5>
              <p>Các bước thực hiện tại thư viện</p>
            </div>
          </div>

          <div className="p-3">
            <div className="d-flex gap-3 mb-4">
              <div className="quick-icon">
                <i className="bi bi-search"></i>
              </div>
              <div>
                <strong>1. Tìm kiếm sách</strong>
                <p className="text-muted mb-0">
                  Tìm đầu sách theo tên, tác giả hoặc ISBN.
                </p>
              </div>
            </div>

            <div className="d-flex gap-3 mb-4">
              <div className="quick-icon">
                <i className="bi bi-person-vcard"></i>
              </div>
              <div>
                <strong>2. Xuất trình thẻ độc giả</strong>
                <p className="text-muted mb-0">
                  Cung cấp thẻ thư viện cho nhân viên tại quầy.
                </p>
              </div>
            </div>

            <div className="d-flex gap-3">
              <div className="quick-icon">
                <i className="bi bi-bookmark-check"></i>
              </div>
              <div>
                <strong>3. Nhận sách</strong>
                <p className="text-muted mb-0">
                  Thủ thư xác nhận giao dịch và bàn giao sách.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card quick-card">
          <div className="card-heading">
            <div>
              <h5>Thông tin tài khoản</h5>
              <p>Thông tin đăng nhập hiện tại</p>
            </div>
          </div>

          <div className="p-3">
            <div className="mb-3">
              <small className="text-muted">Họ và tên</small>
              <div className="fw-semibold">
                {user?.full_name || "—"}
              </div>
            </div>

            <div className="mb-3">
              <small className="text-muted">Vai trò</small>
              <div>
                <span className="badge text-bg-primary">
                  Độc giả
                </span>
              </div>
            </div>

            <hr />

            <p className="text-muted small mb-0">
              Bạn có thể liên hệ thủ thư để được hỗ trợ tra cứu,
              mượn và trả sách tại quầy.
            </p>
          </div>
        </div>
      </section>

      <footer className="dashboard-footer">
        PTIT Library Management System © 2026
      </footer>
    </div>
  );
};

export default ReaderDashboard;
