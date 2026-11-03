
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type ReaderStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "REJECTED"
  | "LOCKED";

interface Reader {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  card_code?: string | null;
  status: ReaderStatus;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  _count?: {
    borrowings_as_reader?: number;
    reservations?: number;
    fines_as_reader?: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusLabels: Record<ReaderStatus, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  REJECTED: "Đã từ chối",
  LOCKED: "Đã khóa",
};

const statusColors: Record<ReaderStatus, string> = {
  PENDING_APPROVAL: "warning",
  ACTIVE: "success",
  REJECTED: "danger",
  LOCKED: "secondary",
};

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  address: "",
};

const ReadersPage: React.FC = () => {
  const { user, accessToken, hasPermission } = useAuth();

  // Chỉ ADMIN mới được phép xóa độc giả
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  console.log("Thông tin user:", user);
  console.log("Danh sách roles:", user?.roles);
  console.log("isAdmin:", isAdmin);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [rejectingReader, setRejectingReader] = useState<Reader | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
          ...options.headers,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Có lỗi xảy ra khi xử lý yêu cầu.");
      }

      return result;
    },
    [accessToken]
  );

  // Tải danh sách độc giả
  const loadReaders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const result = await request(`/users/readers?${params.toString()}`);

      const data = result.data || {};
      setReaders(data.readers || []);

      setPagination((previous) => ({
        ...previous,
        ...(data.pagination || {}),
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách độc giả."
      );
    } finally {
      setLoading(false);
    }
  }, [request, pagination.page, pagination.limit, search, status]);

  useEffect(() => {
    void loadReaders();
  }, [loadReaders]);

  // Hiển thị thông báo
  const showMessage = (message: string) => {
    setSuccess(message);
    setError("");
    window.setTimeout(() => setSuccess(""), 3500);
  };

  // Mở form thêm độc giả
  const openCreateForm = () => {
    setEditingReader(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  // Mở form chỉnh sửa độc giả
  const openEditForm = (reader: Reader) => {
    setEditingReader(reader);

    setForm({
      email: reader.email,
      password: "",
      full_name: reader.full_name,
      phone: reader.phone || "",
      address: reader.address || "",
    });

    setShowForm(true);
  };

  // Thêm hoặc cập nhật độc giả
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingReader) {
        await request(`/users/readers/${editingReader.id}`, {
          method: "PUT",
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone || undefined,
            address: form.address || undefined,
          }),
        });

        showMessage("Cập nhật thông tin độc giả thành công.");
      } else {
        await request("/users/readers", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            phone: form.phone || undefined,
            address: form.address || undefined,
          }),
        });

        showMessage("Thêm độc giả thành công.");
      }

      setShowForm(false);
      setForm(emptyForm);
      await loadReaders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể lưu thông tin độc giả."
      );
    } finally {
      setSaving(false);
    }
  };

  // Duyệt, từ chối, khóa hoặc mở khóa độc giả
  const handleReaderAction = async (
    reader: Reader,
    action: "approve" | "reject" | "lock" | "unlock",
    reason?: string
  ) => {
    const actionNames = {
      approve: "duyệt",
      reject: "từ chối",
      lock: "khóa",
      unlock: "mở khóa",
    };

    if (
      action !== "reject" &&
      !window.confirm(
        `Bạn có chắc chắn muốn ${actionNames[action]} độc giả này?`
      )
    ) {
      return;
    }

    try {
      const body =
        action === "reject"
          ? JSON.stringify({ rejection_reason: reason })
          : undefined;

      await request(`/users/readers/${reader.id}/${action}`, {
        method: "PATCH",
        body,
      });

      showMessage(`Đã ${actionNames[action]} độc giả thành công.`);
      setRejectingReader(null);
      setRejectionReason("");

      await loadReaders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể thực hiện thao tác."
      );
    }
  };

  // Xóa mềm tài khoản độc giả - chỉ ADMIN
  const handleDeleteReader = async (reader: Reader) => {
    if (!isAdmin) {
      setError("Bạn không có quyền xóa tài khoản độc giả.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài khoản của độc giả "${reader.full_name}"?\n\n` +
        "Tài khoản sẽ bị vô hiệu hóa và không thể đăng nhập lại."
    );

    if (!confirmed) return;

    try {
      await request(`/users/readers/${reader.id}`, {
        method: "DELETE",
      });

      showMessage(
        `Đã xóa tài khoản độc giả "${reader.full_name}" thành công.`
      );

      // Đóng hộp thoại chi tiết nếu đang mở đúng độc giả
      if (selectedReader?.id === reader.id) {
        setShowDetail(false);
        setSelectedReader(null);
      }

      await loadReaders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa tài khoản độc giả."
      );
    }
  };

  // Xem chi tiết độc giả
  const openDetail = async (reader: Reader) => {
    try {
      const result = await request(`/users/readers/${reader.id}`);

      setSelectedReader(result.data);
      setShowDetail(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải thông tin độc giả."
      );
    }
  };

  // Định dạng ngày tháng
  const formatDate = (date?: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("vi-VN");
  };

  const canView = hasPermission("users:view");
  const canCreate = hasPermission("users:create");
  const canUpdate = hasPermission("users:update");
  const canApprove = hasPermission("users:approve");
  const canLock = hasPermission("users:lock");

  if (!canView) {
    return (
      <div className="dashboard-content">
        <div className="alert alert-danger">
          Bạn không có quyền xem danh sách độc giả.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="mb-1">Quản lý độc giả</h2>
          <p className="text-muted mb-0">
            Quản lý tài khoản và thông tin độc giả của thư viện.
          </p>
        </div>

        {canCreate && (
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-person-plus me-2"></i>
            Thêm độc giả
          </button>
        )}
      </div>

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

      {/* Bộ lọc và tìm kiếm */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Tìm kiếm độc giả</label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Tên, email, số điện thoại hoặc mã thẻ..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPagination((previous) => ({
                      ...previous,
                      page: 1,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label">Trạng thái</label>

              <select
                className="form-select"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING_APPROVAL">Chờ duyệt</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="REJECTED">Đã từ chối</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>

            <div className="col-md-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Tổng độc giả</div>
              <h3 className="mb-0">{pagination.total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Đang hiển thị</div>
              <h3 className="mb-0">{readers.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Trang hiện tại</div>
              <h3 className="mb-0">
                {pagination.page}/{pagination.totalPages || 1}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Số bản ghi mỗi trang</div>

              <select
                className="form-select mt-1"
                value={pagination.limit}
                onChange={(event) =>
                  setPagination((previous) => ({
                    ...previous,
                    limit: Number(event.target.value),
                    page: 1,
                  }))
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách độc giả */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <strong>Danh sách độc giả</strong>

          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => void loadReaders()}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Làm mới
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Độc giả</th>
                <th>Mã thẻ</th>
                <th>Số điện thoại</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="text-muted mt-2 mb-0">
                      Đang tải danh sách...
                    </p>
                  </td>
                </tr>
              ) : readers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-2 d-block mb-2"></i>
                    Không tìm thấy độc giả.
                  </td>
                </tr>
              ) : (
                readers.map((reader) => (
                  <tr key={reader.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-primary-subtle text-primary d-flex justify-content-center align-items-center fw-bold"
                          style={{ width: 38, height: 38 }}
                        >
                          {reader.full_name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {reader.full_name}
                          </div>
                          <small className="text-muted">
                            {reader.email}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{reader.card_code || "Chưa cấp"}</td>
                    <td>{reader.phone || "—"}</td>
                    <td>{formatDate(reader.created_at)}</td>

                    <td>
                      <span
                        className={`badge text-bg-${statusColors[reader.status]}`}
                      >
                        {statusLabels[reader.status] || reader.status}
                      </span>
                    </td>

                    <td>
                      <div className="d-flex justify-content-center gap-1 flex-wrap">
                        {/* Xem chi tiết */}
                        <button
                          className="btn btn-sm btn-outline-info"
                          title="Xem chi tiết"
                          onClick={() => void openDetail(reader)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        {/* Chỉnh sửa */}
                        {canUpdate && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Chỉnh sửa"
                            onClick={() => openEditForm(reader)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}

                        {/* Xóa tài khoản - chỉ ADMIN */}
                        {isAdmin && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Xóa tài khoản độc giả"
                            onClick={() =>
                              void handleDeleteReader(reader)
                            }
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}

                        {/* Duyệt và từ chối */}
                        {canApprove &&
                          reader.status === "PENDING_APPROVAL" && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-success"
                                title="Duyệt độc giả"
                                onClick={() =>
                                  void handleReaderAction(reader, "approve")
                                }
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>

                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Từ chối"
                                onClick={() => {
                                  setRejectingReader(reader);
                                  setRejectionReason("");
                                }}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          )}

                        {/* Khóa tài khoản */}
                        {canLock && reader.status === "ACTIVE" && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Khóa tài khoản"
                            onClick={() =>
                              void handleReaderAction(reader, "lock")
                            }
                          >
                            <i className="bi bi-lock"></i>
                          </button>
                        )}

                        {/* Mở khóa tài khoản */}
                        {canLock && reader.status === "LOCKED" && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Mở khóa tài khoản"
                            onClick={() =>
                              void handleReaderAction(reader, "unlock")
                            }
                          >
                            <i className="bi bi-unlock"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <small className="text-muted">
            Tổng cộng {pagination.total} độc giả
          </small>

          <div className="btn-group">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
            >
              <i className="bi bi-chevron-left"></i>
            </button>

            <button className="btn btn-sm btn-outline-secondary" disabled>
              {pagination.page}
            </button>

            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={
                pagination.page >= pagination.totalPages || loading
              }
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Modal thêm và chỉnh sửa độc giả */}
      {showForm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingReader ? "Chỉnh sửa độc giả" : "Thêm độc giả"}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowForm(false)}
                  ></button>
                </div>

                <div className="modal-body">
                  {!editingReader && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={form.email}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              email: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Mật khẩu *</label>
                        <input
                          type="password"
                          className="form-control"
                          required
                          minLength={8}
                          value={form.password}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              password: event.target.value,
                            })
                          }
                        />

                        <small className="text-muted">
                          Mật khẩu tối thiểu 8 ký tự.
                        </small>
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Họ và tên *</label>
                    <input
                      className="form-control"
                      required
                      value={form.full_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          full_name: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Địa chỉ</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.address}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          address: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết độc giả */}
      {showDetail && selectedReader && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Thông tin độc giả</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowDetail(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-primary-subtle text-primary d-flex justify-content-center align-items-center fw-bold mx-auto mb-2"
                    style={{ width: 65, height: 65, fontSize: 25 }}
                  >
                    {selectedReader.full_name.charAt(0).toUpperCase()}
                  </div>

                  <h5>{selectedReader.full_name}</h5>

                  <span
                    className={`badge text-bg-${statusColors[selectedReader.status]}`}
                  >
                    {statusLabels[selectedReader.status]}
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <small className="text-muted">Email</small>
                    <div>{selectedReader.email}</div>
                  </div>

                  <div className="col-6">
                    <small className="text-muted">Mã thẻ</small>
                    <div>{selectedReader.card_code || "Chưa cấp"}</div>
                  </div>

                  <div className="col-6">
                    <small className="text-muted">Số điện thoại</small>
                    <div>{selectedReader.phone || "—"}</div>
                  </div>

                  <div className="col-6">
                    <small className="text-muted">Ngày tạo</small>
                    <div>{formatDate(selectedReader.created_at)}</div>
                  </div>

                  <div className="col-12">
                    <small className="text-muted">Địa chỉ</small>
                    <div>{selectedReader.address || "—"}</div>
                  </div>

                  {selectedReader.rejection_reason && (
                    <div className="col-12">
                      <small className="text-muted">Lý do từ chối</small>
                      <div className="text-danger">
                        {selectedReader.rejection_reason}
                      </div>
                    </div>
                  )}

                  <div className="col-12">
                    <hr />
                    <strong>Thống kê hoạt động</strong>

                    <div className="row mt-2">
                      <div className="col-4">
                        <div className="text-muted small">Lượt mượn</div>
                        <strong>
                          {selectedReader._count?.borrowings_as_reader ?? 0}
                        </strong>
                      </div>

                      <div className="col-4">
                        <div className="text-muted small">Đặt trước</div>
                        <strong>
                          {selectedReader._count?.reservations ?? 0}
                        </strong>
                      </div>

                      <div className="col-4">
                        <div className="text-muted small">Tiền phạt</div>
                        <strong>
                          {selectedReader._count?.fines_as_reader ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetail(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối đăng ký */}
      {rejectingReader && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Từ chối đăng ký độc giả
                </h5>

                <button
                  className="btn-close"
                  onClick={() => setRejectingReader(null)}
                ></button>
              </div>

              <div className="modal-body">
                <p>
                  Bạn đang từ chối đăng ký của{" "}
                  <strong>{rejectingReader.full_name}</strong>.
                </p>

                <label className="form-label">Lý do từ chối *</label>

                <textarea
                  className="form-control"
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(event.target.value)
                  }
                  placeholder="Nhập lý do từ chối..."
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setRejectingReader(null)}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-danger"
                  disabled={!rejectionReason.trim()}
                  onClick={() =>
                    void handleReaderAction(
                      rejectingReader,
                      "reject",
                      rejectionReason.trim()
                    )
                  }
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadersPage;
