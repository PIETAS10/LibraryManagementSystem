
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BorrowedBook {
  id: string;
  barcode: string;
  book: {
    id: string;
    title: string;
    isbn: string | null;
    cover_image_url: string | null;
  };
  borrow_date: string;
  due_date: string;
  status: string;
  borrowing_id: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN");

const getDateOnly = (value: string) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const ReaderBorrowedBooksPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [books, setBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/circulation/my-borrowed-books`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Không thể tải danh sách sách đang mượn",
        );
      }

      setBooks(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const today = getDateOnly(new Date().toISOString());

  const getBookStatus = (dueDate: string) => {
    const due = getDateOnly(dueDate);
    const diff = Math.ceil(
      (due.getTime() - today.getTime()) / 86400000,
    );

    if (diff < 0) {
      return {
        label: `Quá hạn ${Math.abs(diff)} ngày`,
        color: "danger",
        remaining: diff,
      };
    }

    if (diff === 0) {
      return {
        label: "Đến hạn trả hôm nay",
        color: "warning",
        remaining: diff,
      };
    }

    return {
      label: "Đang mượn",
      color: "success",
      remaining: diff,
    };
  };

  const overdueCount = books.filter(
    (book) => getBookStatus(book.due_date).remaining < 0,
  ).length;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h4 className="mb-1">Sách đang mượn</h4>
          <p className="text-muted mb-0">
            Theo dõi sách đã mượn và thời hạn trả sách
          </p>
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={() => void loadBooks()}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Làm mới
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Tổng số sách đang mượn</div>
              <h3 className="mb-0">{books.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Sách quá hạn</div>
              <h3 className="mb-0 text-danger">{overdueCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <strong>Danh sách sách</strong>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary"></div>
            <p className="text-muted mt-2 mb-0">Đang tải dữ liệu...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-book display-4 text-muted"></i>
            <h5 className="mt-3">Bạn chưa có sách đang mượn</h5>
            <p className="text-muted mb-0">
              Danh sách sách sẽ xuất hiện tại đây sau khi bạn mượn sách tại thư viện.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tên sách</th>
                  <th>Mã ISBN</th>
                  <th>Mã vạch</th>
                  <th>Ngày mượn</th>
                  <th>Hạn trả</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {books.map((item) => {
                  const status = getBookStatus(item.due_date);

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {item.book.cover_image_url ? (
                            <img
                              src={item.book.cover_image_url}
                              alt={item.book.title}
                              style={{
                                width: 42,
                                height: 56,
                                objectFit: "cover",
                              }}
                              className="rounded"
                            />
                          ) : (
                            <div
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ width: 42, height: 56 }}
                            >
                              <i className="bi bi-book text-muted"></i>
                            </div>
                          )}

                          <strong>{item.book.title}</strong>
                        </div>
                      </td>
                      <td>{item.book.isbn || "—"}</td>
                      <td>{item.barcode}</td>
                      <td>{formatDate(item.borrow_date)}</td>
                      <td>{formatDate(item.due_date)}</td>
                      <td>
                        <span className={`badge text-bg-${status.color}`}>
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
  );
};

export default ReaderBorrowedBooksPage;
