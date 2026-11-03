
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type TabType = "borrow" | "return";

interface Reader {
  id: string;
  card_code: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  status: string;
  borrowed_count: number;
  remaining_slots: number;
}

interface BookCopy {
  id: string;
  barcode: string;
  status: string;
  condition: string;
  shelf_location?: string | null;
  book: {
    id: string;
    title: string;
    isbn?: string | null;
    cover_image_url?: string | null;
  };
}

interface BorrowItem {
  barcode: string;
  copy: BookCopy;
}

const conditionLabels: Record<string, string> = {
  NEW: "Mới",
  GOOD: "Tốt",
  FAIR: "Khá",
  POOR: "Kém",
  DAMAGED: "Hư hỏng",
};

const CirculationPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("borrow");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dữ liệu lập phiếu mượn
  const [cardCode, setCardCode] = useState("");
  const [reader, setReader] = useState<Reader | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);

  const [bookBarcode, setBookBarcode] = useState("");
  const [borrowItems, setBorrowItems] = useState<BorrowItem[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Dữ liệu trả sách
  const [returnBarcode, setReturnBarcode] = useState("");
  const [conditionAfter, setConditionAfter] = useState("GOOD");
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnResult, setReturnResult] = useState<any>(null);

  const request = async (
    path: string,
    options: RequestInit = {}
  ) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "Có lỗi xảy ra khi xử lý yêu cầu."
      );
    }

    return result;
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess("");
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setError("");
  };

  // Tra cứu độc giả
  const handleFindReader = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    clearMessages();

    if (!cardCode.trim()) {
      showError("Vui lòng nhập mã thẻ độc giả.");
      return;
    }

    setReaderLoading(true);
    setReader(null);
    setBorrowItems([]);

    try {
      const result = await request(
        `/circulation/readers/${encodeURIComponent(cardCode.trim())}`
      );

      setReader(result.data);
      showSuccess("Tìm thấy thông tin độc giả.");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Không thể tìm độc giả."
      );
    } finally {
      setReaderLoading(false);
    }
  };

  // Tra cứu bản sách
  const handleFindCopy = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    clearMessages();

    if (!reader) {
      showError("Vui lòng tra cứu độc giả trước.");
      return;
    }

    if (borrowItems.length >= reader.remaining_slots) {
      showError("Độc giả đã hết số lượt mượn còn lại.");
      return;
    }

    if (!bookBarcode.trim()) {
      showError("Vui lòng nhập mã vạch bản sách.");
      return;
    }

    if (
      borrowItems.some(
        (item) => item.barcode === bookBarcode.trim()
      )
    ) {
      showError("Bản sách này đã có trong danh sách mượn.");
      return;
    }

    setCopyLoading(true);

    try {
      const result = await request(
        `/circulation/copies/${encodeURIComponent(bookBarcode.trim())}`
      );

      const copy: BookCopy = result.data;

      if (copy.status !== "AVAILABLE") {
        throw new Error("Bản sách hiện không ở trạng thái sẵn sàng.");
      }

      setBorrowItems((previous) => [
        ...previous,
        {
          barcode: copy.barcode,
          copy,
        },
      ]);

      setBookBarcode("");
      showSuccess("Đã thêm bản sách vào danh sách mượn.");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Không thể tìm bản sách."
      );
    } finally {
      setCopyLoading(false);
    }
  };

  // Xóa bản sách khỏi danh sách
  const handleRemoveCopy = (barcode: string) => {
    setBorrowItems((previous) =>
      previous.filter((item) => item.barcode !== barcode)
    );
  };

  // Lập phiếu mượn
  const handleCreateBorrowing = async () => {
    clearMessages();

    if (!reader) {
      showError("Vui lòng tra cứu độc giả.");
      return;
    }

    if (borrowItems.length === 0) {
      showError("Vui lòng thêm ít nhất một bản sách.");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận lập phiếu mượn ${borrowItems.length} bản sách cho ${reader.full_name}?`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const result = await request("/circulation/borrow", {
        method: "POST",
        body: JSON.stringify({
          card_code: reader.card_code,
          barcodes: borrowItems.map((item) => item.barcode),
          notes: notes.trim() || undefined,
        }),
      });

      const borrowing = result.data;

      showSuccess(
        `Lập phiếu mượn thành công! Mã phiếu: ${borrowing.id}`
      );

      setBorrowItems([]);
      setReader(null);
      setCardCode("");
      setBookBarcode("");
      setNotes("");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Không thể lập phiếu mượn."
      );
    } finally {
      setLoading(false);
    }
  };

  // Trả sách
  const handleReturnBook = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    clearMessages();
    setReturnResult(null);

    if (!returnBarcode.trim()) {
      showError("Vui lòng nhập mã vạch bản sách.");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận trả bản sách ${returnBarcode.trim()}?`
      )
    ) {
      return;
    }

    setReturnLoading(true);

    try {
      const result = await request("/circulation/return", {
        method: "POST",
        body: JSON.stringify({
          barcode: returnBarcode.trim(),
          condition_after: conditionAfter,
        }),
      });

      setReturnResult(result.data);
      setReturnBarcode("");

      showSuccess("Trả sách thành công.");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Không thể thực hiện trả sách."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <div className="dashboard-content">
      <div className="mb-4">
        <h2 className="mb-1">Quản lý mượn và trả sách</h2>
        <p className="text-muted mb-0">
          Quản lý việc cho mượn, nhận trả và tình trạng bản sách.
        </p>
      </div>

      {/* Thông báo */}
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      {/* Chuyển tab */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="btn-group w-100">
            <button
              type="button"
              className={`btn ${
                activeTab === "borrow"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setActiveTab("borrow");
                clearMessages();
              }}
            >
              <i className="bi bi-box-arrow-up-right me-2"></i>
              Lập phiếu mượn
            </button>

            <button
              type="button"
              className={`btn ${
                activeTab === "return"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setActiveTab("return");
                clearMessages();
              }}
            >
              <i className="bi bi-box-arrow-in-left me-2"></i>
              Trả sách
            </button>
          </div>
        </div>
      </div>

      {/* TAB MƯỢN SÁCH */}
      {activeTab === "borrow" && (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3">
              <strong>
                <i className="bi bi-person-vcard me-2"></i>
                Thông tin độc giả
              </strong>
            </div>

            <div className="card-body">
              <form
                onSubmit={handleFindReader}
                className="row g-3 align-items-end"
              >
                <div className="col-md-8">
                  <label className="form-label">
                    Mã thẻ độc giả
                  </label>
                  <input
                    className="form-control"
                    value={cardCode}
                    onChange={(event) =>
                      setCardCode(event.target.value)
                    }
                    placeholder="Nhập mã thẻ độc giả..."
                  />
                </div>

                <div className="col-md-4">
                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={readerLoading}
                  >
                    {readerLoading ? (
                      "Đang tìm..."
                    ) : (
                      <>
                        <i className="bi bi-search me-2"></i>
                        Tra cứu độc giả
                      </>
                    )}
                  </button>
                </div>
              </form>

              {reader && (
                <div className="border rounded p-3 mt-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle bg-primary-subtle text-primary d-flex justify-content-center align-items-center fw-bold"
                      style={{
                        width: 50,
                        height: 50,
                        fontSize: 20,
                      }}
                    >
                      {reader.full_name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h5 className="mb-1">
                        {reader.full_name}
                      </h5>
                      <span className="badge text-bg-success">
                        Đang hoạt động
                      </span>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <small className="text-muted">
                        Mã thẻ
                      </small>
                      <div className="fw-semibold">
                        {reader.card_code}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <small className="text-muted">
                        Email
                      </small>
                      <div>{reader.email || "—"}</div>
                    </div>

                    <div className="col-md-4">
                      <small className="text-muted">
                        Số điện thoại
                      </small>
                      <div>{reader.phone || "—"}</div>
                    </div>
                  </div>

                  <hr />

                  <div className="row text-center g-3">
                    <div className="col-6">
                      <div className="text-muted small">
                        Đang mượn
                      </div>
                      <h4>{reader.borrowed_count}</h4>
                    </div>

                    <div className="col-6">
                      <div className="text-muted small">
                        Còn được mượn
                      </div>
                      <h4 className="text-success">
                        {reader.remaining_slots}
                      </h4>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {reader && (
            <>
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white py-3">
                  <strong>
                    <i className="bi bi-upc-scan me-2"></i>
                    Thêm bản sách vào phiếu mượn
                  </strong>
                </div>

                <div className="card-body">
                  <form
                    onSubmit={handleFindCopy}
                    className="row g-3 align-items-end"
                  >
                    <div className="col-md-8">
                      <label className="form-label">
                        Mã vạch bản sách
                      </label>
                      <input
                        className="form-control"
                        value={bookBarcode}
                        onChange={(event) =>
                          setBookBarcode(event.target.value)
                        }
                        placeholder="Nhập hoặc quét mã vạch..."
                      />
                    </div>

                    <div className="col-md-4">
                      <button
                        type="submit"
                        className="btn btn-outline-primary w-100"
                        disabled={
                          copyLoading ||
                          borrowItems.length >= reader.remaining_slots
                        }
                      >
                        {copyLoading
                          ? "Đang tìm..."
                          : "Thêm bản sách"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-3">
                    <small className="text-muted">
                      Thời hạn mượn: 14 ngày. Tối đa 5 bản sách
                      trên mỗi độc giả.
                    </small>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between">
                  <strong>Danh sách bản sách mượn</strong>
                  <span className="badge text-bg-primary">
                    {borrowItems.length} bản sách
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>STT</th>
                        <th>Tên sách</th>
                        <th>Mã vạch</th>
                        <th>ISBN</th>
                        <th>Tình trạng</th>
                        <th className="text-center">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {borrowItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-4 text-muted"
                          >
                            Chưa có bản sách nào.
                          </td>
                        </tr>
                      ) : (
                        borrowItems.map((item, index) => (
                          <tr key={item.barcode}>
                            <td>{index + 1}</td>
                            <td className="fw-semibold">
                              {item.copy.book.title}
                            </td>
                            <td>{item.barcode}</td>
                            <td>{item.copy.book.isbn || "—"}</td>
                            <td>
                              {conditionLabels[
                                item.copy.condition
                              ] || item.copy.condition}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                type="button"
                                title="Xóa khỏi danh sách"
                                onClick={() =>
                                  handleRemoveCopy(item.barcode)
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="card-body">
                  <label className="form-label">
                    Ghi chú phiếu mượn
                  </label>
                  <textarea
                    className="form-control mb-3"
                    rows={2}
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Ghi chú nếu có..."
                  />

                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    disabled={
                      loading || borrowItems.length === 0
                    }
                    onClick={() => void handleCreateBorrowing()}
                  >
                    {loading ? (
                      "Đang lập phiếu..."
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Xác nhận lập phiếu mượn
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB TRẢ SÁCH */}
      {activeTab === "return" && (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3">
              <strong>
                <i className="bi bi-upc-scan me-2"></i>
                Tiếp nhận trả sách
              </strong>
            </div>

            <div className="card-body">
              <form onSubmit={handleReturnBook}>
                <div className="mb-3">
                  <label className="form-label">
                    Mã vạch bản sách
                  </label>
                  <input
                    className="form-control"
                    value={returnBarcode}
                    onChange={(event) =>
                      setReturnBarcode(event.target.value)
                    }
                    placeholder="Nhập hoặc quét mã vạch sách đang mượn..."
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Tình trạng sách sau khi trả
                  </label>
                  <select
                    className="form-select"
                    value={conditionAfter}
                    onChange={(event) =>
                      setConditionAfter(event.target.value)
                    }
                  >
                    <option value="NEW">Mới</option>
                    <option value="GOOD">Tốt</option>
                    <option value="FAIR">Khá</option>
                    <option value="POOR">Kém</option>
                    <option value="DAMAGED">Hư hỏng</option>
                  </select>
                  <small className="text-muted">
                    Nếu chọn Hư hỏng, bản sách sẽ chuyển sang trạng
                    thái bảo trì.
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={returnLoading}
                >
                  {returnLoading ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Xác nhận trả sách
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {returnResult && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <strong>
                  <i className="bi bi-receipt me-2"></i>
                  Kết quả trả sách
                </strong>
              </div>

              <div className="card-body">
                <div className="alert alert-success">
                  Đã tiếp nhận trả sách thành công.
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <small className="text-muted">
                      Độc giả
                    </small>
                    <div className="fw-semibold">
                      {returnResult.reader?.full_name || "—"}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Mã thẻ
                    </small>
                    <div>
                      {returnResult.reader?.card_code || "—"}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Tên sách
                    </small>
                    <div className="fw-semibold">
                      {returnResult.book?.title || "—"}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Mã vạch
                    </small>
                    <div>{returnResult.barcode}</div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Ngày trả
                    </small>
                    <div>
                      {formatDate(returnResult.returned_date)}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Tình trạng sau khi trả
                    </small>
                    <div>
                      {conditionLabels[
                        returnResult.condition_after
                      ] || returnResult.condition_after}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Trạng thái bản sách
                    </small>
                    <div>
                      <span
                        className={`badge ${
                          returnResult.copy_status === "AVAILABLE"
                            ? "text-bg-success"
                            : "text-bg-warning"
                        }`}
                      >
                        {returnResult.copy_status === "AVAILABLE"
                          ? "Có thể cho mượn"
                          : "Đang bảo trì"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <small className="text-muted">
                      Trạng thái phiếu mượn
                    </small>
                    <div>
                      {returnResult.borrowing_status}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="text-muted small">
                      Số ngày quá hạn
                    </div>
                    <h4>
                      {returnResult.overdue_days} ngày
                    </h4>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small">
                      Tiền phạt quá hạn
                    </div>
                    <h4
                      className={
                        returnResult.overdue_fine > 0
                          ? "text-danger"
                          : "text-success"
                      }
                    >
                      {formatCurrency(
                        Number(returnResult.overdue_fine || 0)
                      )}
                    </h4>
                  </div>
                </div>

                {returnResult.overdue_fine > 0 && (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Độc giả có khoản phạt quá hạn chưa thanh toán.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CirculationPage;
