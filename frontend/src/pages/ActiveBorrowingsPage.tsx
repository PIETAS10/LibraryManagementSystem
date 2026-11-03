
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ActiveBorrowing {
  id: string;
  borrowing_id: string;
  reader: {
    id: string;
    card_code: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  book: {
    id: string;
    title: string;
    isbn: string;
    cover_image_url?: string | null;
  };
  barcode: string;
  borrow_date: string;
  due_date: string;
  condition_before: string;
  status: string;
  borrowing_status: string;
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("vi-VN");
};

const isOverdue = (date: string) => {
  const dueDate = new Date(date);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const ActiveBorrowingsPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [borrowings, setBorrowings] = useState<ActiveBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/circulation/active-borrowings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải danh sách sách đang mượn"
        );
      }

      setBorrowings(result.data || []);
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
      void fetchBorrowings();
    }
  }, [accessToken]);

  const filteredBorrowings = borrowings.filter((item) => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return true;

    return (
      item.reader.full_name.toLowerCase().includes(keyword) ||
      item.reader.card_code.toLowerCase().includes(keyword) ||
      item.book.title.toLowerCase().includes(keyword) ||
      item.book.isbn.toLowerCase().includes(keyword) ||
      item.barcode.toLowerCase().includes(keyword)
    );
  });

  const overdueCount = borrowings.filter((item) =>
    isOverdue(item.due_date)
  ).length;

  return (
    <div className="dashboard-content">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Theo dõi sách đang mượn</h2>
          <p className="text-muted mb-0">
            Quản lý và theo dõi các bản sách hiện đang được độc giả mượn.
          </p>
        </div>

        <button
          className="btn btn-outline-primary"
          type="button"
          onClick={() => void fetchBorrowings()}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Làm mới
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Tổng số bản sách đang mượn</p>
              <h3 className="mb-0">{borrowings.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Đang trong hạn</p>
              <h3 className="text-primary mb-0">
                {borrowings.length - overdueCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Đã quá hạn</p>
              <h3 className="text-danger mb-0">{overdueCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm theo độc giả, mã thẻ, tên sách hoặc mã vạch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-6 text-md-end mt-2 mt-md-0">
              <span className="text-muted">
                Hiển thị {filteredBorrowings.length} / {borrowings.length} bản sách
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-3">
                Đang tải danh sách sách đang mượn...
              </p>
            </div>
          ) : error ? (
            <div className="alert alert-danger mb-0">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          ) : filteredBorrowings.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-journal-x fs-1 text-muted"></i>
              <h5 className="mt-3">
                {borrowings.length === 0
                  ? "Hiện không có sách đang được mượn"
                  : "Không tìm thấy kết quả phù hợp"}
              </h5>
              <p className="text-muted mb-0">
                Thử tìm kiếm bằng tên độc giả, mã thẻ hoặc mã vạch khác.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Độc giả</th>
                    <th>Mã thẻ</th>
                    <th>Tên sách</th>
                    <th>ISBN</th>
                    <th>Mã vạch bản sách</th>
                    <th>Ngày mượn</th>
                    <th>Hạn trả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBorrowings.map((item, index) => {
                    const overdue = isOverdue(item.due_date);

                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>

                        <td className="fw-semibold">
                          {item.reader.full_name}
                        </td>

                        <td>{item.reader.card_code}</td>

                        <td>{item.book.title}</td>

                        <td>{item.book.isbn}</td>

                        <td>
                          <span className="fw-semibold text-primary">
                            {item.barcode}
                          </span>
                        </td>

                        <td>{formatDate(item.borrow_date)}</td>

                        <td>{formatDate(item.due_date)}</td>

                        <td>
                          {overdue ? (
                            <span className="badge bg-danger">
                              Quá hạn
                            </span>
                          ) : (
                            <span className="badge bg-primary">
                              Đang mượn
                            </span>
                          )}
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

export default ActiveBorrowingsPage;
