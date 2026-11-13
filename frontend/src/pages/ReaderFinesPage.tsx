import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

interface ReaderFine {
  id: string;
  amount: number | string;
  reason: string;
  status: "UNPAID" | "PAID" | "WAIVED";
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  borrowing_detail: {
    book_copy: {
      book: {
        title: string;
      };
    };
  } | null;
}

const reasonLabels: Record<string, string> = {
  OVERDUE: "Trả sách quá hạn",
  DAMAGED_BOOK: "Làm hỏng sách",
  LOST_BOOK: "Làm mất sách",
  OTHER: "Khác",
};

const ReaderFinesPage: React.FC = () => {
  const { accessToken } = useAuth();
  const [fines, setFines] = useState<ReaderFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFines = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/fines/my-fines`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải khoản phạt");
      }

      setFines(result.data || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Đã xảy ra lỗi khi tải khoản phạt",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFines();
  }, [loadFines]);

  const unpaidTotal = fines
    .filter((fine) => fine.status === "UNPAID")
    .reduce((total, fine) => total + Number(fine.amount), 0);

  return (
    <div className="dashboard-content">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Khoản phạt của tôi</h2>
          <p className="text-muted mb-0">
            Theo dõi các khoản phạt và trạng thái thanh toán.
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          type="button"
          onClick={() => void loadFines()}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Làm mới
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <span className="text-muted">Tổng tiền chưa thanh toán</span>
          <h3 className="text-danger mb-0">
            {unpaidTotal.toLocaleString("vi-VN")} VNĐ
          </h3>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-3">Đang tải khoản phạt...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : fines.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-check-circle fs-1 text-success"></i>
              <h5 className="mt-3">Bạn chưa có khoản phạt</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Ngày tạo</th>
                    <th>Sách</th>
                    <th>Lý do</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((fine) => (
                    <tr key={fine.id}>
                      <td>
                        {new Date(fine.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td>
                        {fine.borrowing_detail?.book_copy.book.title || "—"}
                      </td>
                      <td>{reasonLabels[fine.reason] || fine.reason}</td>
                      <td className="fw-semibold">
                        {Number(fine.amount).toLocaleString("vi-VN")} VNĐ
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            fine.status === "PAID"
                              ? "bg-success"
                              : fine.status === "WAIVED"
                                ? "bg-secondary"
                                : "bg-danger"
                          }`}
                        >
                          {fine.status === "PAID"
                            ? "Đã thanh toán"
                            : fine.status === "WAIVED"
                              ? "Được miễn"
                              : "Chưa thanh toán"}
                        </span>
                      </td>
                      <td>{fine.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReaderFinesPage;
