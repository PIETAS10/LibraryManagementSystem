
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type EmployeeStatus = "ACTIVE" | "LOCKED";

interface Employee {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface EmployeeForm {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  address: string;
}

const emptyForm: EmployeeForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  address: "",
};

const EmployeesPage: React.FC = () => {
  const { accessToken, user } = useAuth();

  // Chỉ ADMIN mới được thao tác quản lý nhân viên
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Có lỗi xảy ra");
      }

      return result;
    },
    [accessToken],
  );

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search,
        status,
      });

      const result = await request(`/users/employees?${params}`);

      setEmployees(result.data.employees || []);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách nhân viên",
      );
    } finally {
      setLoading(false);
    }
  }, [request, pagination.page, pagination.limit, search, status]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const openCreateModal = () => {
    if (!isAdmin) return;

    setEditingEmployee(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (employee: Employee) => {
    if (!isAdmin) return;

    setEditingEmployee(employee);
    setForm({
      email: employee.email,
      password: "",
      full_name: employee.full_name,
      phone: employee.phone || "",
      address: employee.address || "",
    });
    setShowModal(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAdmin) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingEmployee) {
        await request(`/users/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            address: form.address,
          }),
        });

        setMessage("Cập nhật thông tin nhân viên thành công");
      } else {
        await request("/users/employees", {
          method: "POST",
          body: JSON.stringify(form),
        });

        setMessage("Tạo tài khoản nhân viên thành công");
      }

      setShowModal(false);
      setForm(emptyForm);
      setPagination((prev) => ({ ...prev, page: 1 }));
      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu thông tin nhân viên",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeAction = async (
    employee: Employee,
    action: "lock" | "unlock",
  ) => {
    if (!isAdmin) return;

    const actionText = action === "lock" ? "khóa" : "mở khóa";

    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await request(`/users/employees/${employee.id}/${action}`, {
        method: "PATCH",
      });

      setMessage(
        action === "lock"
          ? "Đã khóa tài khoản nhân viên"
          : "Đã mở khóa tài khoản nhân viên",
      );

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Không thể ${actionText} tài khoản`,
      );
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="mb-1">Quản lý nhân viên</h3>
          <p className="text-muted mb-0">
            Quản lý tài khoản thủ thư của thư viện
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <i className="bi bi-person-plus me-2"></i>
            Thêm nhân viên
          </button>
        )}
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible">
          {message}
          <button
            className="btn-close"
            onClick={() => setMessage("")}
          ></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-7">
              <label className="form-label">Tìm kiếm nhân viên</label>
              <input
                className="form-control"
                placeholder="Nhập họ tên, email hoặc số điện thoại..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Trạng thái</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={loadEmployees}
                disabled={loading}
              >
                <i className="bi bi-search me-1"></i>
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <strong>Danh sách nhân viên</strong>
          <span className="badge bg-primary">
            {pagination.total} nhân viên
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-3">STT</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                {isAdmin && <th className="text-center">Thao tác</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center text-muted py-4"
                  >
                    Không tìm thấy nhân viên
                  </td>
                </tr>
              ) : (
                employees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td className="ps-3">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="fw-semibold">{employee.full_name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.phone || "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          employee.status === "ACTIVE"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {employee.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Đã khóa"}
                      </span>
                    </td>
                    <td>
                      {new Date(employee.created_at).toLocaleDateString("vi-VN")}
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Sửa thông tin"
                            onClick={() => openEditModal(employee)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>

                          {employee.status === "ACTIVE" ? (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Khóa tài khoản"
                              onClick={() =>
                                handleEmployeeAction(employee, "lock")
                              }
                            >
                              <i className="bi bi-lock"></i>
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-success"
                              title="Mở khóa tài khoản"
                              onClick={() =>
                                handleEmployeeAction(employee, "unlock")
                              }
                            >
                              <i className="bi bi-unlock"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <small className="text-muted">
            Trang {pagination.page} / {Math.max(pagination.totalPages, 1)}
          </small>

          <div className="btn-group">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Trước
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={
                pagination.page >= pagination.totalPages || loading
              }
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {isAdmin && showModal && (
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
                    {editingEmployee
                      ? "Cập nhật nhân viên"
                      : "Tạo tài khoản nhân viên"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Họ và tên <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      required
                      minLength={2}
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      disabled={!!editingEmployee}
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>

                  {!editingEmployee && (
                    <div className="mb-3">
                      <label className="form-label">
                        Mật khẩu <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        required
                        minLength={8}
                        maxLength={72}
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                      />
                      <small className="text-muted">
                        Mật khẩu phải có ít nhất 8 ký tự.
                      </small>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Địa chỉ</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </div>

                  {!editingEmployee && (
                    <div className="alert alert-info mb-0">
                      Tài khoản được tạo với quyền <strong>LIBRARIAN</strong>
                      {" "}và có thể đăng nhập ngay sau khi tạo.
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
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
    </div>
  );
};

export default EmployeesPage;
