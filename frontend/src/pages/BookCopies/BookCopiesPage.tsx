
import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Book {
  id: string;
  title: string;
  isbn: string | null;
}

interface BookCopy {
  id: string;
  book_id: string;
  barcode: string;
  status: string;
  condition: string;
  shelf_location: string | null;
  price: number | string;
  book: Book;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BookCopyForm {
  book_id: string;
  shelf_location: string;
  condition: string;
  price: string;
}

const emptyForm: BookCopyForm = {
  book_id: "",
  shelf_location: "",
  condition: "NEW",
  price: "0",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Có sẵn",
  BORROWED: "Đang được mượn",
  RESERVED: "Đã đặt trước",
  MAINTENANCE: "Đang bảo trì",
  LOST: "Đã mất",
};

const conditionLabels: Record<string, string> = {
  NEW: "Mới",
  GOOD: "Tốt",
  FAIR: "Trung bình",
  POOR: "Kém",
  DAMAGED: "Hư hỏng",
};

function BookCopiesPage() {
  const { accessToken, hasPermission } = useAuth();
  const canManage = hasPermission("copies:manage");

  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookCopyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  });

  const loadBooks = async () => {
    const response = await fetch(`${API_BASE}/books?limit=100`);
    const result: ApiResponse<Book[]> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể tải danh sách đầu sách");
    }

    setBooks(Array.isArray(result.data) ? result.data : []);
  };

  const loadCopies = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (conditionFilter) {
        params.set("condition", conditionFilter);
      }

      const response = await fetch(
        `${API_BASE}/book-copies?${params.toString()}`
      );

      const result: ApiResponse<BookCopy[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải danh sách bản sách");
      }

      setCopies(Array.isArray(result.data) ? result.data : []);
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
    void loadBooks();
    void loadCopies();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      book_id: books[0]?.id || "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (copy: BookCopy) => {
    setEditingId(copy.id);
    setForm({
      book_id: copy.book_id,
      shelf_location: copy.shelf_location || "",
      condition: copy.condition,
      price: String(copy.price),
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canManage || !accessToken) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    if (!editingId && !form.book_id) {
      setError("Vui lòng chọn đầu sách");
      return;
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price < 0) {
      setError("Giá sách không hợp lệ");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingId
        ? `${API_BASE}/book-copies/${editingId}`
        : `${API_BASE}/book-copies`;

      const body = editingId
        ? {
            shelf_location: form.shelf_location.trim(),
            condition: form.condition,
            price,
          }
        : {
            book_id: form.book_id,
            shelf_location: form.shelf_location.trim(),
            condition: form.condition,
            price,
          };

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu thông tin bản sách");
      }

      setShowModal(false);
      await loadCopies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi khi lưu dữ liệu"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (copy: BookCopy) => {
    if (!canManage || !accessToken) {
      window.alert("Bạn không có quyền xóa bản sách");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa bản sách ${copy.barcode} không?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/book-copies/${copy.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể xóa bản sách");
      }

      await loadCopies();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Lỗi khi xóa bản sách"
      );
    }
  };

  const formatPrice = (value: number | string) => {
    return Number(value).toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý bản sách</h3>
          <p className="text-muted mb-0">
            Quản lý từng cuốn sách vật lý trong thư viện
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={openCreateModal}
            disabled={books.length === 0}
          >
            + Thêm bản sách
          </Button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-lg-5">
              <Form.Control
                type="search"
                placeholder="Tìm theo mã vạch hoặc tên sách..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadCopies();
                }}
              />
            </div>

            <div className="col-lg-3">
              <Form.Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="AVAILABLE">Có sẵn</option>
                <option value="BORROWED">Đang được mượn</option>
                <option value="RESERVED">Đã đặt trước</option>
                <option value="MAINTENANCE">Đang bảo trì</option>
                <option value="LOST">Đã mất</option>
              </Form.Select>
            </div>

            <div className="col-lg-2">
              <Form.Select
                value={conditionFilter}
                onChange={(event) => setConditionFilter(event.target.value)}
              >
                <option value="">Mọi tình trạng</option>
                <option value="NEW">Mới</option>
                <option value="GOOD">Tốt</option>
                <option value="FAIR">Trung bình</option>
                <option value="POOR">Kém</option>
                <option value="DAMAGED">Hư hỏng</option>
              </Form.Select>
            </div>

            <div className="col-lg-2 d-grid">
              <Button variant="outline-primary" onClick={() => void loadCopies()}>
                <i className="bi bi-search me-1"></i>
                Tìm kiếm
              </Button>
            </div>
          </div>

          {error && !showModal && (
            <div className="alert alert-danger">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <Table responsive hover bordered className="align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "55px" }}>STT</th>
                  <th>Mã vạch</th>
                  <th>Tên đầu sách</th>
                  <th>Vị trí kệ</th>
                  <th>Tình trạng</th>
                  <th>Trạng thái</th>
                  <th>Giá sách</th>
                  {canManage && <th style={{ width: "145px" }}>Thao tác</th>}
                </tr>
              </thead>

              <tbody>
                {copies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 8 : 7}
                      className="text-center py-4 text-muted"
                    >
                      Không tìm thấy bản sách
                    </td>
                  </tr>
                ) : (
                  copies.map((copy, index) => (
                    <tr key={copy.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{copy.barcode}</td>
                      <td>{copy.book?.title || "—"}</td>
                      <td>{copy.shelf_location || "—"}</td>
                      <td>{conditionLabels[copy.condition] || copy.condition}</td>
                      <td>
                        <span
                          className={`badge ${
                            copy.status === "AVAILABLE"
                              ? "bg-success"
                              : copy.status === "BORROWED"
                              ? "bg-warning text-dark"
                              : copy.status === "LOST"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {statusLabels[copy.status] || copy.status}
                        </span>
                      </td>
                      <td>{formatPrice(copy.price)}</td>

                      {canManage && (
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-1"
                            onClick={() => openEditModal(copy)}
                          >
                            Sửa
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => void handleDelete(copy)}
                          >
                            Xóa
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          <div className="text-muted small">
            Số bản sách hiển thị: {copies.length}
          </div>
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={() => !saving && setShowModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? "Cập nhật bản sách" : "Thêm bản sách mới"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          {!editingId && (
            <Form.Group className="mb-3">
              <Form.Label>
                Đầu sách <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={form.book_id}
                onChange={(event) =>
                  setForm({ ...form, book_id: event.target.value })
                }
              >
                <option value="">-- Chọn đầu sách --</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          {editingId && (
            <Form.Group className="mb-3">
              <Form.Label>Đầu sách</Form.Label>
              <Form.Control
                value={
                  copies.find((copy) => copy.id === editingId)?.book.title || ""
                }
                disabled
              />
            </Form.Group>
          )}

          {!editingId && (
            <div className="alert alert-info py-2">
              <i className="bi bi-info-circle me-2"></i>
              Mã vạch sẽ được hệ thống tự động tạo sau khi lưu.
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Vị trí kệ</Form.Label>
            <Form.Control
              value={form.shelf_location}
              onChange={(event) =>
                setForm({ ...form, shelf_location: event.target.value })
              }
              placeholder="Ví dụ: A1-02"
              maxLength={100}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tình trạng vật lý</Form.Label>
            <Form.Select
              value={form.condition}
              onChange={(event) =>
                setForm({ ...form, condition: event.target.value })
              }
            >
              <option value="NEW">Mới</option>
              <option value="GOOD">Tốt</option>
              <option value="FAIR">Trung bình</option>
              <option value="POOR">Kém</option>
              <option value="DAMAGED">Hư hỏng</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Giá sách (VNĐ)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={form.price}
              onChange={(event) =>
                setForm({ ...form, price: event.target.value })
              }
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            disabled={saving}
          >
            Hủy
          </Button>

          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default BookCopiesPage;
