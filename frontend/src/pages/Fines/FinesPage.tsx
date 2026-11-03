
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Fine {
  id: string;
  amount: number | string;
  reason: string;
  status: string;
  payment_method: string;
  receipt_number?: string | null;
  paid_at?: string | null;
  waiver_reason?: string | null;
  notes?: string | null;
  created_at: string;
  reader?: {
    id: string;
    card_code?: string | null;
    full_name: string;
    email: string;
    phone?: string | null;
  };
  collector?: {
    id: string;
    full_name: string;
  } | null;
  borrowing_detail?: {
    book_copy: {
      barcode: string;
      book: {
        title: string;
        isbn?: string | null;
      };
    };
  } | null;
}

const reasonLabels: Record<string, string> = {
  OVERDUE: "Trả sách quá hạn",
  DAMAGED_BOOK: "Làm hỏng sách",
  LOST_BOOK: "Làm mất sách",
  OTHER: "Lý do khác",
};

const statusLabels: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  WAIVED: "Đã miễn phạt",
};

const paymentLabels: Record<string, string> = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
};

const FinesPage: React.FC = () => {
  const { accessToken, user } = useAuth();

  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showWaiveModal, setShowWaiveModal] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [waiverReason, setWaiverReason] = useState("");

  const roles: string[] = user?.roles || [];
  const isReader = roles.includes("READER");
  const canManage = roles.includes("ADMIN") || roles.includes("LIBRARIAN");

  // Tải danh sách tiền phạt
  const loadFines = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError("");

      const path = isReader ? "/fines/my-fines" : "/fines";

      const response = await fetch(`${API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Không thể tải danh sách tiền phạt"
        );
      }

      setFines(result.data || []);
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
      loadFines();
    }
  }, [accessToken, isReader]);

  // Mở hộp thoại thu tiền
  const openPayModal = (fine: Fine) => {
    setSelectedFine(fine);
    setPaymentMethod("CASH");
    setShowPayModal(true);
    setError("");
    setSuccess("");
  };

  // Mở hộp thoại miễn phạt
  const openWaiveModal = (fine: Fine) => {
    setSelectedFine(fine);
    setWaiverReason("");
    setShowWaiveModal(true);
    setError("");
    setSuccess("");
  };

  // Gửi yêu cầu thu tiền
  const handlePayFine = async () => {
    if (!selectedFine || !accessToken) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/fines/${selectedFine.id}/pay`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            payment_method: paymentMethod,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Không thể thu tiền phạt");
      }

      setShowPayModal(false);
      setSelectedFine(null);
      setSuccess("Thu tiền phạt thành công!");

      await loadFines();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi khi thu tiền phạt"
      );
    } finally {
      setProcessing(false);
    }
  };

  // Gửi yêu cầu miễn phạt
  const handleWaiveFine = async () => {
    if (!selectedFine || !accessToken) return;

    if (!waiverReason.trim()) {
      setError("Vui lòng nhập lý do miễn phạt");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/fines/${selectedFine.id}/waive`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            waiver_reason: waiverReason.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Không thể miễn tiền phạt");
      }

      setShowWaiveModal(false);
      setSelectedFine(null);
      setSuccess("Miễn tiền phạt thành công!");

      await loadFines();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi khi miễn tiền phạt"
      );
    } finally {
      setProcessing(false);
    }
  };

  // Tìm kiếm và lọc
  const filteredFines = fines.filter((fine) => {
    const searchText = keyword.toLowerCase();

    const matchesKeyword =
      (fine.reader?.full_name || "").toLowerCase().includes(searchText) ||
      (fine.reader?.card_code || "").toLowerCase().includes(searchText) ||
      (fine.borrowing_detail?.book_copy.book.title || "")
        .toLowerCase()
        .includes(searchText) ||
      (fine.receipt_number || "").toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "ALL" || fine.status === statusFilter;

    return matchesKeyword && matchesStatus;
  });

  // Thống kê tiền phạt
  const totalFine = fines.reduce(
    (sum, fine) => sum + Number(fine.amount),
    0
  );

  const unpaidFine = fines
    .filter((fine) => fine.status === "UNPAID")
    .reduce((sum, fine) => sum + Number(fine.amount), 0);

  const paidFine = fines
    .filter((fine) => fine.status === "PAID")
    .reduce((sum, fine) => sum + Number(fine.amount), 0);

  const waivedFine = fines
    .filter((fine) => fine.status === "WAIVED")
    .reduce((sum, fine) => sum + Number(fine.amount), 0);

  const formatMoney = (amount: number) =>
    amount.toLocaleString("vi-VN") + " ₫";

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleString("vi-VN") : "—";

  return (
    <div className="container-fluid py-3">
      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            {isReader ? "Tiền phạt của tôi" : "Quản lý tiền phạt"}
          </h3>
          <p className="text-muted mb-0">
            Theo dõi và xử lý các khoản phạt phát sinh trong thư viện
          </p>
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={loadFines}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Làm mới
        </button>
      </div>

      {/* Thông báo */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      {/* Thống kê */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Tổng tiền phạt</div>
              <h4 className="fw-bold text-primary mt-2">
                {formatMoney(totalFine)}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Chưa thanh toán</div>
              <h4 className="fw-bold text-danger mt-2">
                {formatMoney(unpaidFine)}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Đã thanh toán</div>
              <h4 className="fw-bold text-success mt-2">
                {formatMoney(paidFine)}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Đã miễn phạt</div>
              <h4 className="fw-bold text-secondary mt-2">
                {formatMoney(waivedFine)}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách tiền phạt */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên độc giả, mã thẻ, tên sách, biên lai..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="WAIVED">Đã miễn phạt</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
            </div>
          ) : filteredFines.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-receipt fs-1"></i>
              <p className="mt-2">Không có khoản tiền phạt nào.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    {!isReader && <th>Độc giả</th>}
                    <th>Sách</th>
                    <th>Lý do</th>
                    <th>Số tiền</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th>Thông tin xử lý</th>
                    {canManage && <th>Thao tác</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredFines.map((fine, index) => (
                    <tr key={fine.id}>
                      <td>{index + 1}</td>

                      {!isReader && (
                        <td>
                          <div className="fw-semibold">
                            {fine.reader?.full_name || "Không xác định"}
                          </div>
                          <small className="text-muted">
                            {fine.reader?.card_code || "Chưa có mã thẻ"}
                          </small>
                        </td>
                      )}

                      <td>
                        {fine.borrowing_detail?.book_copy.book.title ||
                          "Không liên kết sách"}

                        {fine.borrowing_detail?.book_copy.barcode && (
                          <div className="text-muted small">
                            Mã cuốn: {fine.borrowing_detail.book_copy.barcode}
                          </div>
                        )}
                      </td>

                      <td>
                        {reasonLabels[fine.reason] || fine.reason}
                      </td>

                      <td className="fw-semibold">
                        {formatMoney(Number(fine.amount))}
                      </td>

                      <td>{formatDate(fine.created_at)}</td>

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
                          {statusLabels[fine.status] || fine.status}
                        </span>
                      </td>

                      <td>
                        {fine.status === "PAID" && (
                          <div className="small">
                            <div>
                              <strong>Người thu:</strong>{" "}
                              {fine.collector?.full_name || "—"}
                            </div>
                            <div>
                              <strong>Ngày thu:</strong>{" "}
                              {formatDate(fine.paid_at)}
                            </div>
                            <div>
                              <strong>Hình thức:</strong>{" "}
                              {paymentLabels[fine.payment_method] ||
                                fine.payment_method}
                            </div>
                            <div>
                              <strong>Biên lai:</strong>{" "}
                              {fine.receipt_number || "—"}
                            </div>
                          </div>
                        )}

                        {fine.status === "WAIVED" && (
                          <div className="small text-muted">
                            <strong>Lý do:</strong>{" "}
                            {fine.waiver_reason || "Không có thông tin"}
                          </div>
                        )}

                        {fine.status === "UNPAID" && (
                          <span className="text-muted small">
                            Chưa xử lý
                          </span>
                        )}
                      </td>

                      {canManage && (
                        <td>
                          {fine.status === "UNPAID" ? (
                            <div className="d-flex flex-column gap-2">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => openPayModal(fine)}
                              >
                                <i className="bi bi-cash-coin me-1"></i>
                                Thu tiền
                              </button>

                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => openWaiveModal(fine)}
                              >
                                <i className="bi bi-shield-check me-1"></i>
                                Miễn phạt
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">Đã xử lý</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-muted small mt-3">
            Hiển thị {filteredFines.length} / {fines.length} khoản tiền phạt
          </div>
        </div>
      </div>

      {/* Modal thu tiền */}
      {showPayModal && selectedFine && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cash-coin text-success me-2"></i>
                  Xác nhận thu tiền phạt
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPayModal(false)}
                  disabled={processing}
                ></button>
              </div>

              <div className="modal-body">
                <p>
                  Bạn xác nhận thu khoản tiền phạt{" "}
                  <strong>
                    {formatMoney(Number(selectedFine.amount))}
                  </strong>
                  ?
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Phương thức thanh toán
                  </label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={processing}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="TRANSFER">Chuyển khoản</option>
                    <option value="CARD">Thẻ</option>
                  </select>
                </div>

                <div className="alert alert-info small mb-0">
                  Hệ thống sẽ tự động cập nhật trạng thái và tạo mã biên lai
                  sau khi xác nhận.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPayModal(false)}
                  disabled={processing}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-success"
                  onClick={handlePayFine}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận thu tiền"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal miễn phạt */}
      {showWaiveModal && selectedFine && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-check text-secondary me-2"></i>
                  Xác nhận miễn tiền phạt
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowWaiveModal(false)}
                  disabled={processing}
                ></button>
              </div>

              <div className="modal-body">
                <p>
                  Bạn đang thực hiện miễn khoản phạt{" "}
                  <strong>
                    {formatMoney(Number(selectedFine.amount))}
                  </strong>
                  .
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Lý do miễn phạt <span className="text-danger">*</span>
                  </label>

                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Nhập lý do miễn tiền phạt..."
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    disabled={processing}
                  ></textarea>
                </div>

                <div className="alert alert-warning small mb-0">
                  Lưu ý: Đây là thao tác miễn toàn bộ khoản phạt. Sau khi xác
                  nhận, khoản phạt sẽ chuyển sang trạng thái Đã miễn phạt.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowWaiveModal(false)}
                  disabled={processing}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-dark"
                  onClick={handleWaiveFine}
                  disabled={processing || !waiverReason.trim()}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận miễn phạt"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinesPage;
