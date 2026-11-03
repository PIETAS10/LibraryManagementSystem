
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  _count?: {
    book_categories: number;
  };
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data: Category[] | Category;
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const emptyForm = {
  name: '',
  description: '',
};

const createSlug = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const CategoriesPage: React.FC = () => {
  const { accessToken, hasPermission } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canManage = hasPermission('categories:manage');

  const fetchCategories = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/categories`);
      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Không thể tải danh sách thể loại.',
        );
      }

      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi tải thể loại.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const filteredCategories = categories.filter((category) => {
    const keyword = search.toLowerCase().trim();

    return (
      category.name.toLowerCase().includes(keyword) ||
      category.slug.toLowerCase().includes(keyword) ||
      (category.description || '').toLowerCase().includes(keyword)
    );
  });

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!accessToken) {
      setFormError(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
      return;
    }

    const name = form.name.trim();
    const description = form.description.trim();

    if (name.length < 2 || name.length > 100) {
      setFormError('Tên thể loại phải có từ 2 đến 100 ký tự.');
      return;
    }

    if (description.length > 500) {
      setFormError('Mô tả không được vượt quá 500 ký tự.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/categories/${editingId}`
          : `${API_URL}/categories`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          // Backend tự tạo slug từ tên thể loại.
          body: JSON.stringify({
            name,
            description,
          }),
        },
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể lưu thể loại.');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await fetchCategories();

      alert(
        editingId
          ? 'Cập nhật thể loại thành công!'
          : 'Thêm thể loại thành công!',
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi lưu thể loại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!accessToken) {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa thể loại "${category.name}" không?`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);

    try {
      const response = await fetch(
        `${API_URL}/categories/${category.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Không thể xóa thể loại này.',
        );
      }

      await fetchCategories();
      alert('Xóa thể loại thành công!');
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi xóa thể loại.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý thể loại</h3>
          <p className="text-muted mb-0">
            Quản lý các thể loại sách trong thư viện
          </p>
        </div>

        {canManage && (
          <button
            className="btn btn-danger"
            onClick={openCreateForm}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Thêm thể loại
          </button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Tìm tên, slug hoặc mô tả..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-auto">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSearch('')}
              >
                Làm mới tìm kiếm
              </button>
            </div>

            <div className="col text-md-end align-self-center">
              <span className="text-muted">
                Tổng số: <strong>{categories.length}</strong> thể loại
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>STT</th>
                  <th>Tên thể loại</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th className="text-center">Số liên kết sách</th>
                  {canManage && (
                    <th className="text-center">Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="text-center py-4"
                    >
                      <div className="spinner-border spinner-border-sm text-danger me-2"></div>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="text-center text-muted py-4"
                    >
                      Không tìm thấy thể loại nào
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category, index) => (
                    <tr key={category.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{category.name}</td>
                      <td>
                        <code>{category.slug}</code>
                      </td>
                      <td>{category.description || '—'}</td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">
                          {category._count?.book_categories ?? '—'}
                        </span>
                      </td>

                      {canManage && (
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditForm(category)}
                            >
                              <i className="bi bi-pencil-square me-1"></i>
                              Sửa
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(category)}
                              disabled={deletingId === category.id}
                            >
                              {deletingId === category.id ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <>
                                  <i className="bi bi-trash me-1"></i>
                                  Xóa
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1055,
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingId ? 'Sửa thể loại' : 'Thêm thể loại mới'}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeForm}
                    disabled={saving}
                  ></button>
                </div>

                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">
                      {formError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">
                      Tên thể loại <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Slug dự kiến</label>
                    <input
                      className="form-control bg-light"
                      value={createSlug(form.name)}
                      readOnly
                    />
                    <small className="text-muted">
                      Slug sẽ được backend tự động tạo từ tên thể loại.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      maxLength={500}
                      value={form.description}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                    />
                    <small className="text-muted">
                      Tối đa 500 ký tự.
                    </small>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thể loại'
                    )}
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

export default CategoriesPage;
