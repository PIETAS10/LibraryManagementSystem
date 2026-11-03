
import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Author {
  id: number;
  name: string;
  bio: string | null;
  birth_date: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

function AuthorsPage() {
  const { accessToken, hasPermission } = useAuth();
  const canManageAuthors = hasPermission("authors:manage");

  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    bio: "",
    birth_date: "",
  });

  const getHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  });

  const loadAuthors = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/authors`);
      const result: ApiResponse<Author[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải danh sách tác giả"
        );
      }

      setAuthors(Array.isArray(result.data) ? result.data : []);
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
    void loadAuthors();
  }, []);

  const filteredAuthors = authors.filter((author) =>
    author.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: "", bio: "", birth_date: "" });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (author: Author) => {
    setEditingId(author.id);
    setForm({
      name: author.name,
      bio: author.bio || "",
      birth_date: author.birth_date
        ? author.birth_date.substring(0, 10)
        : "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên tác giả");
      return;
    }

    if (!canManageAuthors || !accessToken) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingId
        ? `${API_BASE}/authors/${editingId}`
        : `${API_BASE}/authors`;

      // Chuyển ngày sinh từ YYYY-MM-DD sang ISO 8601.
      const birthDate = form.birth_date
        ? new Date(
            `${form.birth_date}T00:00:00.000Z`
          ).toISOString()
        : null;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim(),
          birth_date: birthDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lưu tác giả");
      }

      setShowModal(false);
      await loadAuthors();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi khi lưu dữ liệu"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (author: Author) => {
    if (!canManageAuthors || !accessToken) {
      window.alert("Bạn không có quyền xóa tác giả");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tác giả "${author.name}" không?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/authors/${author.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể xóa tác giả");
      }

      await loadAuthors();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi xóa"
      );
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý tác giả</h3>
          <p className="text-muted mb-0">
            Quản lý thông tin các tác giả trong thư viện
          </p>
        </div>

        {canManageAuthors && (
          <Button variant="primary" onClick={openCreateModal}>
            + Thêm tác giả
          </Button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <Form.Control
            className="mb-3"
            type="search"
            placeholder="Tìm kiếm theo tên tác giả..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

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
                  <th style={{ width: "70px" }}>STT</th>
                  <th>Tên tác giả</th>
                  <th>Ngày sinh</th>
                  <th>Tiểu sử</th>
                  {canManageAuthors && (
                    <th style={{ width: "170px" }}>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredAuthors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageAuthors ? 5 : 4}
                      className="text-center py-4 text-muted"
                    >
                      Không tìm thấy tác giả
                    </td>
                  </tr>
                ) : (
                  filteredAuthors.map((author, index) => (
                    <tr key={author.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{author.name}</td>
                      <td>
                        {author.birth_date
                          ? new Date(
                              author.birth_date
                            ).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td>
                        {author.bio
                          ? author.bio.length > 80
                            ? `${author.bio.substring(0, 80)}...`
                            : author.bio
                          : "—"}
                      </td>

                      {canManageAuthors && (
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => openEditModal(author)}
                          >
                            Sửa
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => void handleDelete(author)}
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
            Tổng số tác giả: {filteredAuthors.length}
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
            {editingId ? "Cập nhật tác giả" : "Thêm tác giả mới"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>
              Tên tác giả <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Nhập tên tác giả"
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ngày sinh</Form.Label>
            <Form.Control
              type="date"
              value={form.birth_date}
              onChange={(event) =>
                setForm({ ...form, birth_date: event.target.value })
              }
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Tiểu sử</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={form.bio}
              onChange={(event) =>
                setForm({ ...form, bio: event.target.value })
              }
              placeholder="Nhập thông tin tiểu sử..."
              maxLength={10000}
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

export default AuthorsPage;
