
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type DashboardAction = 'createBook' | 'createReader';

interface DashboardProps {
  onNavigate: (page: string, action?: DashboardAction) => void;
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface DashboardStatistics {
  total_books: number;
  available_books: number;
  borrowed_books: number;
  overdue_books: number;
}

interface DashboardActivity {
  reader: string;
  book: string;
  action: string;
  date: string;
  status: string;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data?: {
    statistics: DashboardStatistics;
    recent_activities: DashboardActivity[];
    current_date: string;
  };
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('vi-VN');
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { accessToken, hasPermission } = useAuth();
  const canCreateBook = hasPermission('books:create');
  const canCreateReader = hasPermission('users:create');

  const [statistics, setStatistics] = useState<DashboardStatistics>({
    total_books: 0,
    available_books: 0,
    borrowed_books: 0,
    overdue_books: 0,
  });

  const [recentActivities, setRecentActivities] = useState<
    DashboardActivity[]
  >([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_URL}/dashboard/overview`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(
            result?.message || 'Không thể tải dữ liệu tổng quan',
          );
        }

        const result = (await response.json()) as DashboardResponse;

        if (!result.success || !result.data) {
          throw new Error(
            result.message || 'Dữ liệu Dashboard không hợp lệ',
          );
        }

        if (!active) return;

        setStatistics(result.data.statistics);
        setRecentActivities(result.data.recent_activities);
        setCurrentDate(new Date(result.data.current_date));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Đã xảy ra lỗi khi tải Dashboard',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const statisticCards = [
    {
      title: 'Tổng đầu sách',
      value: statistics.total_books,
      detail: 'Đầu sách trong hệ thống',
      icon: 'bi bi-book',
      color: 'red',
      page: 'Quản lý sách',
    },
    {
      title: 'Sách có sẵn',
      value: statistics.available_books,
      detail: 'Có thể cho mượn',
      icon: 'bi bi-bookmark-check',
      color: 'green',
      page: 'Quản lý bản sách',
    },
    {
      title: 'Đang được mượn',
      value: statistics.borrowed_books,
      detail: 'Lượt mượn hiện tại',
      icon: 'bi bi-journal-arrow-up',
      color: 'orange',
      page: 'Theo dõi sách đang mượn',
    },
    {
      title: 'Sách quá hạn',
      value: statistics.overdue_books,
      detail: 'Cần xử lý',
      icon: 'bi bi-clock-history',
      color: 'blue',
      page: 'Theo dõi sách đang mượn',
    },
  ];

  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div>
          <h2>Tổng quan thư viện</h2>
          <p>Chào mừng bạn quay trở lại hệ thống quản lý thư viện.</p>
        </div>

        <div className="current-date">
          <i className="bi bi-calendar3"></i>
          {currentDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      </section>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <section className="statistics-grid">
        {statisticCards.map((item) => (
          <button
            className="stat-card stat-card-button"
            key={item.title}
            type="button"
            onClick={() => onNavigate(item.page)}
            aria-label={`Mở ${item.title}`}
          >
            <div className="stat-top">
              <span>{item.title}</span>
              <div className={`stat-icon ${item.color}`}>
                <i className={item.icon}></i>
              </div>
            </div>

            <h3>
              {loading ? '...' : numberFormatter.format(item.value)}
            </h3>
            <p>{item.detail}</p>
          </button>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="content-card activity-card">
          <div className="card-heading">
            <div>
              <h5>Hoạt động gần đây</h5>
              <p>Theo dõi các giao dịch mượn và trả sách</p>
            </div>

            <button
              className="view-all-btn"
              type="button"
              onClick={() => onNavigate('Theo dõi sách đang mượn')}
            >
              Xem tất cả <i className="bi bi-arrow-right"></i>
            </button>
          </div>

          <div className="table-responsive">
            <table className="table activity-table">
              <thead>
                <tr>
                  <th>ĐỘC GIẢ</th>
                  <th>TÊN SÁCH</th>
                  <th>HOẠT ĐỘNG</th>
                  <th>NGÀY</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Chưa có hoạt động nào.
                    </td>
                  </tr>
                ) : (
                  recentActivities.map((activity, index) => (
                    <tr key={`${activity.reader}-${activity.book}-${index}`}>
                      <td className="reader-name">{activity.reader}</td>
                      <td>{activity.book}</td>
                      <td>{activity.action}</td>
                      <td>{formatDate(activity.date)}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            activity.status === 'Đang mượn'
                              ? 'borrowing'
                              : 'completed'
                          }`}
                        >
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card quick-card">
          <div className="card-heading">
            <div>
              <h5>Truy cập nhanh</h5>
              <p>Các chức năng thường dùng</p>
            </div>
          </div>

          {canCreateBook && (
            <button
              className="quick-item"
              type="button"
              onClick={() => onNavigate('Quản lý sách', 'createBook')}
            >
              <div className="quick-icon">
                <i className="bi bi-plus-lg"></i>
              </div>
              <div>
                <strong>Thêm đầu sách</strong>
                <span>Nhập thông tin sách mới</span>
              </div>
              <i className="bi bi-chevron-right"></i>
            </button>
          )}

          <button
            className="quick-item"
            type="button"
            onClick={() => onNavigate('Mượn và trả sách')}
          >
            <div className="quick-icon">
              <i className="bi bi-arrow-left-right"></i>
            </div>
            <div>
              <strong>Mượn / Trả sách</strong>
              <span>Thực hiện giao dịch thư viện</span>
            </div>
            <i className="bi bi-chevron-right"></i>
          </button>

          {canCreateReader && (
            <button
              className="quick-item"
              type="button"
              onClick={() => onNavigate('Độc giả', 'createReader')}
            >
              <div className="quick-icon">
                <i className="bi bi-person-plus"></i>
              </div>
              <div>
                <strong>Thêm độc giả</strong>
                <span>Đăng ký độc giả mới</span>
              </div>
              <i className="bi bi-chevron-right"></i>
            </button>
          )}
        </div>
      </section>

      <footer className="dashboard-footer">
        PTIT Library Management System © 2026
      </footer>
    </div>
  );
};

export default Dashboard;
