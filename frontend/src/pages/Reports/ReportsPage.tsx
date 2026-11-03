
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ReportsPage.css';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ReportsData {
  period: {
    from: string;
    to: string;
  };
  books: {
    total_titles: number;
    total_copies: number;
    available: number;
    borrowed: number;
    reserved: number;
    maintenance: number;
    lost: number;
  };
  circulation: {
    borrowing_slips: number;
    returned_books: number;
    currently_borrowed: number;
    overdue: number;
  };
  readers: {
    total_active: number;
    new_readers: number;
  };
  fines: {
    total: number;
    paid: number;
    unpaid: number;
    waived: number;
    total_count: number;
  };
  top_books: {
    title: string;
    borrow_count: number;
  }[];
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const formatNumber = (value: number) =>
  numberFormatter.format(value || 0);

const formatMoney = (value: number) =>
  currencyFormatter.format(value || 0);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const ReportsPage: React.FC = () => {
  const { accessToken } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(toDateInput(firstDay));
  const [to, setTo] = useState(toDateInput(today));

  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async (startDate = from, endDate = to) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        from: startDate,
        to: endDate,
      });

      const response = await fetch(
        `${API_URL}/reports/overview?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Không thể tải báo cáo');
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi tải báo cáo',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [accessToken]);

  const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!from || !to) {
      setError('Vui lòng chọn đầy đủ khoảng thời gian.');
      return;
    }

    if (from > to) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    fetchReports(from, to);
  };

  const handleReset = () => {
    const currentDate = new Date();
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    const start = toDateInput(monthStart);
    const end = toDateInput(currentDate);

    setFrom(start);
    setTo(end);
    fetchReports(start, end);
  };

  const bookStatuses = data
    ? [
        {
          label: 'Có sẵn',
          value: data.books.available,
          color: '#31965b',
          icon: 'bi bi-bookmark-check',
        },
        {
          label: 'Đang được mượn',
          value: data.books.borrowed,
          color: '#477bb9',
          icon: 'bi bi-journal-arrow-up',
        },
        {
          label: 'Đã đặt trước',
          value: data.books.reserved,
          color: '#e28b31',
          icon: 'bi bi-bookmark-star',
        },
        {
          label: 'Đang bảo trì',
          value: data.books.maintenance,
          color: '#858585',
          icon: 'bi bi-tools',
        },
        {
          label: 'Đã mất',
          value: data.books.lost,
          color: '#c82026',
          icon: 'bi bi-exclamation-circle',
        },
      ]
    : [];

  const totalStatusCopies = bookStatuses.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const circulationMax = Math.max(
    data?.circulation.borrowing_slips || 0,
    data?.circulation.returned_books || 0,
    1,
  );

  const topBookMax = Math.max(
    ...(data?.top_books.map((book) => book.borrow_count) || [1]),
    1,
  );

  return (
    <div className="dashboard-content reports-page">
      {/* Header */}
      <section className="welcome-section reports-header">
        <div>
          <div className="reports-eyebrow">
            <i className="bi bi-bar-chart-line"></i>
            THỐNG KÊ HỆ THỐNG
          </div>

          <h2>Báo cáo thống kê</h2>
          <p>
            Theo dõi tình hình hoạt động và hiệu quả vận hành thư viện.
          </p>
        </div>

        <div className="reports-date">
          <i className="bi bi-calendar3"></i>
          {today.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      </section>

      {/* Filter */}
      <form className="reports-filter" onSubmit={handleFilter}>
        <div className="reports-filter-title">
          <div className="reports-filter-icon">
            <i className="bi bi-funnel"></i>
          </div>
          <div>
            <strong>Bộ lọc báo cáo</strong>
            <span>Chọn khoảng thời gian muốn thống kê</span>
          </div>
        </div>

        <div className="reports-filter-fields">
          <div className="reports-field">
            <label htmlFor="report-from">Từ ngày</label>
            <input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="reports-field">
            <label htmlFor="report-to">Đến ngày</label>
            <input
              id="report-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <button
            className="reports-filter-button"
            type="submit"
            disabled={loading}
          >
            <i className="bi bi-search"></i>
            {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>

          <button
            className="reports-reset-button"
            type="button"
            onClick={handleReset}
            disabled={loading}
            title="Đặt lại về tháng hiện tại"
          >
            <i className="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </form>

      {error && (
        <div className="alert alert-danger reports-error">
          <i className="bi bi-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="reports-loading">
          <div className="spinner-border text-danger" role="status"></div>
          <p>Đang tổng hợp dữ liệu báo cáo...</p>
        </div>
      ) : data ? (
        <>
          {/* Overview cards */}
          <div className="reports-section-heading">
            <div>
              <h5>Tổng quan thư viện</h5>
              <p>Các chỉ số chính của hệ thống</p>
            </div>
            <span className="reports-live-label">
              <i className="bi bi-circle-fill"></i>
              Dữ liệu thực tế
            </span>
          </div>

          <section className="statistics-grid reports-statistics">
            <ReportStatCard
              title="Tổng đầu sách"
              value={formatNumber(data.books.total_titles)}
              detail="Đầu sách trong thư viện"
              icon="bi bi-book"
              color="red"
            />

            <ReportStatCard
              title="Tổng bản sách"
              value={formatNumber(data.books.total_copies)}
              detail="Tổng số bản lưu trữ"
              icon="bi bi-collection"
              color="blue"
            />

            <ReportStatCard
              title="Độc giả hoạt động"
              value={formatNumber(data.readers.total_active)}
              detail={`+${formatNumber(data.readers.new_readers)} độc giả mới trong kỳ`}
              icon="bi bi-people"
              color="green"
            />

            <ReportStatCard
              title="Sách quá hạn"
              value={formatNumber(data.circulation.overdue)}
              detail="Cần được xử lý"
              icon="bi bi-clock-history"
              color="orange"
            />
          </section>

          {/* Circulation */}
          <div className="reports-section-heading">
            <div>
              <h5>Tình hình mượn – trả</h5>
              <p>Hoạt động lưu thông tài liệu trong kỳ</p>
            </div>
          </div>

          <section className="reports-circulation-grid">
            <div className="content-card reports-circulation-card">
              <div className="card-heading">
                <div>
                  <h5>Hoạt động mượn và trả</h5>
                  <p>So sánh số lượng giao dịch trong kỳ</p>
                </div>
                <i className="bi bi-arrow-left-right reports-heading-icon"></i>
              </div>

              <div className="reports-comparison">
                <div className="reports-comparison-item">
                  <div className="reports-comparison-number">
                    {formatNumber(data.circulation.borrowing_slips)}
                  </div>
                  <span>Phiếu mượn</span>
                  <div className="reports-bar-track">
                    <div
                      className="reports-bar-fill borrow-fill"
                      style={{
                        width: `${
                          (data.circulation.borrowing_slips /
                            circulationMax) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="reports-comparison-item">
                  <div className="reports-comparison-number">
                    {formatNumber(data.circulation.returned_books)}
                  </div>
                  <span>Sách đã trả</span>
                  <div className="reports-bar-track">
                    <div
                      className="reports-bar-fill return-fill"
                      style={{
                        width: `${
                          (data.circulation.returned_books /
                            circulationMax) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="reports-circulation-footer">
                <div>
                  <span>Đang được mượn</span>
                  <strong>
                    {formatNumber(data.circulation.currently_borrowed)}
                  </strong>
                </div>
                <div>
                  <span>Quá hạn</span>
                  <strong className="text-danger">
                    {formatNumber(data.circulation.overdue)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="content-card reports-fine-summary">
              <div className="card-heading">
                <div>
                  <h5>Thống kê tiền phạt</h5>
                  <p>Tình trạng các khoản phạt phát sinh</p>
                </div>
                <i className="bi bi-wallet2 reports-heading-icon"></i>
              </div>

              <div className="reports-fine-total">
                <span>Tổng tiền phạt</span>
                <strong>{formatMoney(data.fines.total)}</strong>
              </div>

              <div className="reports-fine-row">
                <span>
                  <i className="bi bi-circle-fill paid-dot"></i>
                  Đã thanh toán
                </span>
                <strong>{formatMoney(data.fines.paid)}</strong>
              </div>

              <div className="reports-fine-row">
                <span>
                  <i className="bi bi-circle-fill unpaid-dot"></i>
                  Chưa thanh toán
                </span>
                <strong>{formatMoney(data.fines.unpaid)}</strong>
              </div>

              <div className="reports-fine-row">
                <span>
                  <i className="bi bi-circle-fill waived-dot"></i>
                  Đã miễn
                </span>
                <strong>{formatMoney(data.fines.waived)}</strong>
              </div>

              <div className="reports-fine-count">
                <i className="bi bi-receipt"></i>
                {formatNumber(data.fines.total_count)} khoản phạt
              </div>
            </div>
          </section>

          {/* Book status */}
          <div className="reports-section-heading">
            <div>
              <h5>Phân tích kho sách</h5>
              <p>Phân bố tình trạng các bản sách hiện có</p>
            </div>
          </div>

          <section className="reports-bottom-grid">
            <div className="content-card reports-status-card">
              <div className="card-heading">
                <div>
                  <h5>Tình trạng bản sách</h5>
                  <p>Thống kê theo trạng thái hiện tại</p>
                </div>
                <i className="bi bi-pie-chart reports-heading-icon"></i>
              </div>

              <div className="reports-status-total">
                <strong>{formatNumber(data.books.total_copies)}</strong>
                <span>Tổng bản sách</span>
              </div>

              <div className="reports-status-list">
                {bookStatuses.map((item) => {
                  const percentage =
                    totalStatusCopies > 0
                      ? (item.value / totalStatusCopies) * 100
                      : 0;

                  return (
                    <div className="reports-status-item" key={item.label}>
                      <div className="reports-status-label">
                        <span>
                          <i
                            className={item.icon}
                            style={{ color: item.color }}
                          ></i>
                          {item.label}
                        </span>
                        <strong>{formatNumber(item.value)}</strong>
                      </div>

                      <div className="reports-status-track">
                        <div
                          className="reports-status-fill"
                          style={{
                            width: `${percentage}%`,
                            background: item.color,
                          }}
                        />
                      </div>

                      <small>{percentage.toFixed(1)}%</small>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top books */}
            <div className="content-card reports-top-books">
              <div className="card-heading">
                <div>
                  <h5>Sách được mượn nhiều nhất</h5>
                  <p>Top 5 đầu sách trong khoảng thời gian đã chọn</p>
                </div>
                <i className="bi bi-trophy reports-heading-icon"></i>
              </div>

              {data.top_books.length > 0 ? (
                <div className="reports-ranking-list">
                  {data.top_books.map((book, index) => (
                    <div
                      className="reports-ranking-item"
                      key={`${book.title}-${index}`}
                    >
                      <div
                        className={`reports-rank-number rank-${index + 1}`}
                      >
                        {index + 1}
                      </div>

                      <div className="reports-rank-content">
                        <div className="reports-rank-title">
                          {book.title}
                        </div>

                        <div className="reports-rank-track">
                          <div
                            className="reports-rank-fill"
                            style={{
                              width: `${
                                (book.borrow_count / topBookMax) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <strong className="reports-rank-count">
                        {formatNumber(book.borrow_count)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reports-empty">
                  <i className="bi bi-inbox"></i>
                  <p>Chưa có dữ liệu mượn sách trong kỳ.</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="reports-empty reports-no-data">
          <i className="bi bi-bar-chart"></i>
          <p>Không có dữ liệu báo cáo để hiển thị.</p>
        </div>
      )}

      <footer className="dashboard-footer">
        PTIT Library Management System © 2026
      </footer>
    </div>
  );
};

interface ReportStatCardProps {
  title: string;
  value: string;
  detail: string;
  icon: string;
  color: 'red' | 'blue' | 'green' | 'orange';
}

const ReportStatCard: React.FC<ReportStatCardProps> = ({
  title,
  value,
  detail,
  icon,
  color,
}) => (
  <div className="stat-card reports-stat-card">
    <div className="stat-top">
      <span>{title}</span>
      <div className={`stat-icon ${color}`}>
        <i className={icon}></i>
      </div>
    </div>

    <h3>{value}</h3>
    <p>{detail}</p>
  </div>
);

export default ReportsPage;
