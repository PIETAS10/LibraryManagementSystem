
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface HistoryItem {
  id: string;
  borrowing_id: string;
  book: {
    id: string;
    title: string;
    isbn: string;
    cover_image_url?: string | null;
  };
  barcode: string;
  borrow_date: string;
  due_date: string;
  returned_date: string | null;
  status: "BORROWED" | "RETURNED" | "LOST" | "DAMAGED";
  condition_before: string;
  condition_after: string | null;
  borrowing_status: string;
}

const formatDate = (date: string | null) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("vi-VN");
};

const isOverdue = (item: HistoryItem) => {
  if (item.status !== "BORROWED") return false;

  const due = new Date(item.due_date);
  const today = new Date();

  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return due < today;
};

const getStatus = (item: HistoryItem) => {
  if (item.status === "RETURNED") {
    return { label: "Đã trả", className: "bg-success" };
  }

  if (item.status === "LOST") {
    return { label: "Báo mất", className: "bg-danger" };
  }

  if (item.status === "DAMAGED") {
    return { label: "Hư hỏng", className: "bg-warning text-dark" };
  }

  if (isOverdue(item)) {
    return { label: "Quá hạn", className: "bg-danger" };
  }

  return { label: "Đang mượn", className: "bg-primary" };
};

const ReaderBorrowingHistoryPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/circulation/my-history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải lịch sử mượn trả");
      }

      setHistory(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      void fetchHistory();
    }
  }, [accessToken]);

  const borrowedCount = history.filter(
    (item) => item.status === "BORROWED" && !isOverdue(item)
  ).length;

  const returnedCount = history.filter(
    (item) => item.status === "RETURNED"
  ).length;

  const overdueCount = history.filter(isOverdue).length;

  return (
    <div className="dashboard-content">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Lịch sử mượn trả</h2>
          <p className="text-muted mb-0">
            Theo dõi các sách đã mượn và trả tại thư viện.
          </p>
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={() => void fetchHistory()}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Làm mới
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Tổng số lượt mượn</p>
              <h3 className="mb-0">{history.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Đang mượn</p>
              <h3 className="text-primary mb-0">{borrowedCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Đã trả</p>
              <h3 className="text-success mb-0">{returnedCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Quá hạn</p>
              <h3 className="text-danger mb-0">{overdueCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-3">Đang tải lịch sử...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger mb-0">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clock-history fs-1 text-muted"></i>
              <h5 className="mt-3">Chưa có lịch sử mượn trả</h5>
              <p className="text-muted mb-0">
                Các lượt mượn sách của bạn sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Tên sách</th>
                    <th>ISBN</th>
                    <th>Mã vạch</th>
                    <th>Ngày mượn</th>
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item, index) => {
                    const status = getStatus(item);

                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td className="fw-semibold">
                          {item.book?.title || "Không rõ tên sách"}
                        </td>
                        <td>{item.book?.isbn || "—"}</td>
                        <td>{item.barcode}</td>
                        <td>{formatDate(item.borrow_date)}</td>
                        <td>{formatDate(item.due_date)}</td>
                        <td>{formatDate(item.returned_date)}</td>
                        <td>
                          <span className={`badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReaderBorrowingHistoryPage;
