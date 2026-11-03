
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

interface Publisher {
  id: number;
  name: string;
  address: string | null;
  contact_email: string | null;
  phone: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface PublisherForm {
  name: string;
  address: string;
  contact_email: string;
  phone: string;
}

const emptyForm: PublisherForm = {
  name: "",
  address: "",
  contact_email: "",
  phone: "",
};

function PublishersPage() {
  const { accessToken, hasPermission } = useAuth();
  const canManagePublishers = hasPermission("publishers:manage");

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PublisherForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  });

  const loadPublishers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/publishers`);
      const result: ApiResponse<Publisher[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải danh sách nhà xuất bản"
        );
      }

      setPublishers(Array.isArray(result.data) ? result.data : []);
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
    void loadPublishers();
  }, []);

  const filteredPublishers = publishers.filter((publisher) =>
    publisher.name
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (publisher: Publisher) => {
    setEditingId(publisher.id);
    setForm({
      name: publisher.name,
      address: publisher.address || "",
      contact_email: publisher.contact_email || "",
      phone: publisher.phone || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên nhà xuất bản");
      return;
    }

    if (!canManagePublishers || !accessToken) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingId
        ? `${API_BASE}/publishers/${editingId}`
        : `${API_BASE}/publishers`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          contact_email: form.contact_email.trim(),
          phone: form.phone.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể lưu thông tin nhà xuất bản"
        );
      }

      setShowModal(false);
      await loadPublishers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Lỗi khi lưu dữ liệu"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (publisher: Publisher) => {
    if (!canManagePublishers || !accessToken) {
      window.alert("Bạn không có quyền xóa nhà xuất bản");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa nhà xuất bản "${publisher.name}" không?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/publishers/${publisher.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể xóa nhà xuất bản"
        );
      }

      await loadPublishers();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi xóa nhà xuất bản"
      );
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý nhà xuất bản</h3>
          <p className="text-muted mb-0">
            Quản lý thông tin các nhà xuất bản của thư viện
          </p>
        </div>

        {canManagePublishers && (
          <Button variant="primary" onClick={openCreateModal}>
            + Thêm nhà xuất bản
          </Button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <Form.Control
            className="mb-3"
            type="search"
            placeholder="Tìm kiếm theo tên nhà xuất bản..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {error && !showModal && (
            <div className="alert alert-danger">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-2 text-muted">
                Đang tải dữ liệu...
              </p>
            </div>
          ) : (
            <Table responsive hover bordered className="align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th>Tên nhà xuất bản</th>
                  <th>Địa chỉ</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  {canManagePublishers && (
                    <th style={{ width: "170px" }}>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredPublishers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManagePublishers ? 6 : 5}
                      className="text-center py-4 text-muted"
                    >
                      Không tìm thấy nhà xuất bản
                    </td>
                  </tr>
                ) : (
                  filteredPublishers.map((publisher, index) => (
                    <tr key={publisher.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">
                        {publisher.name}
                      </td>
                      <td>{publisher.address || "—"}</td>
                      <td>{publisher.contact_email || "—"}</td>
                      <td>{publisher.phone || "—"}</td>

                      {canManagePublishers && (
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => openEditModal(publisher)}
                          >
                            Sửa
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => void handleDelete(publisher)}
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
            Tổng số nhà xuất bản: {filteredPublishers.length}
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
            {editingId
              ? "Cập nhật nhà xuất bản"
              : "Thêm nhà xuất bản mới"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>
              Tên nhà xuất bản <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Nhập tên nhà xuất bản"
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Địa chỉ</Form.Label>
            <Form.Control
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              placeholder="Nhập địa chỉ"
              maxLength={500}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email liên hệ</Form.Label>
            <Form.Control
              type="email"
              value={form.contact_email}
              onChange={(event) =>
                setForm({
                  ...form,
                  contact_email: event.target.value,
                })
              }
              placeholder="example@email.com"
              maxLength={255}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Số điện thoại</Form.Label>
            <Form.Control
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="Nhập số điện thoại"
              maxLength={30}
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

export default PublishersPage;
