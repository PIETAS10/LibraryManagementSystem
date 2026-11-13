
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Book {
  id: string;
  isbn: string | null;
  title: string;
  publication_year: number | null;
  publisher: { name: string } | null;
  book_authors: { author: { name: string } }[];
  book_categories: { category: { name: string } }[];
  total_copies: number;
}

interface Option {
  id: number;
  name: string;
}

interface BooksResponse {
  success: boolean;
  message?: string;
  data: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const initialForm = {
  isbn: '',
  title: '',
  summary: '',
  publisher_id: '',
  publication_year: '',
  edition: '',
  language: 'vi',
  page_count: '',
  cover_image_url: '',
  author_ids: [] as number[],
  category_ids: [] as number[],
  copy_count: '1',
  shelf_location: '',
  price: '0',
};

interface BooksPageProps {
  openCreateOnMount?: boolean;
  onCreateOpened?: () => void;
}

const BooksPage: React.FC<BooksPageProps> = ({
  openCreateOnMount = false,
  onCreateOpened,
}) => {
  const { accessToken, hasPermission } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  const [authors, setAuthors] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [publishers, setPublishers] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('books:create');
  const canUpdate = hasPermission('books:update');
  const canDelete = hasPermission('books:delete');

  const fetchBooks = async (
    keyword = search,
    currentPage = page,
  ) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        search: keyword,
        page: String(currentPage),
        limit: '10',
      });

      const response = await fetch(`${API_URL}/books?${params}`);
      const result: BooksResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể tải danh sách sách');
      }

      setBooks(result.data || []);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalBooks(result.pagination.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải sách',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks('', 1);
  }, []);

  const loadOptions = async () => {
    setLoadingOptions(true);
    setFormError('');

    try {
      const [authorResponse, categoryResponse, publisherResponse] =
        await Promise.all([
          fetch(`${API_URL}/authors`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/publishers`),
        ]);

      const [authorResult, categoryResult, publisherResult] =
        await Promise.all([
          authorResponse.json(),
          categoryResponse.json(),
          publisherResponse.json(),
        ]);

      if (!authorResponse.ok || !authorResult.success) {
        throw new Error(authorResult.message || 'Không tải được tác giả');
      }

      if (!categoryResponse.ok || !categoryResult.success) {
        throw new Error(categoryResult.message || 'Không tải được thể loại');
      }

      if (!publisherResponse.ok || !publisherResult.success) {
        throw new Error(
          publisherResult.message || 'Không tải được nhà xuất bản',
        );
      }

      setAuthors(authorResult.data || []);
      setCategories(categoryResult.data || []);
      setPublishers(publisherResult.data || []);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu danh mục',
      );
      throw err;
    } finally {
      setLoadingOptions(false);
    }
  };

  const openCreateForm = () => {
    setEditingBookId(null);
    setForm(initialForm);
    setFormError('');
    setShowForm(true);
    loadOptions().catch(() => {});
  };

  useEffect(() => {
    if (!openCreateOnMount) return;
    openCreateForm();
    onCreateOpened?.();
  }, [openCreateOnMount]);

  const openEditForm = async (bookId: string) => {
    if (!accessToken) {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    setEditingBookId(bookId);
    setForm(initialForm);
    setFormError('');
    setShowForm(true);
    setLoadingOptions(true);

    try {
      const [bookResponse] = await Promise.all([
        fetch(`${API_URL}/books/${bookId}`),
        loadOptions(),
      ]);

      const result = await bookResponse.json();

      if (!bookResponse.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Không thể tải thông tin đầu sách');
      }

      const book = result.data;

      setForm({
        isbn: book.isbn || '',
        title: book.title || '',
        summary: book.summary || '',
        publisher_id: book.publisher_id
          ? String(book.publisher_id)
          : '',
        publication_year: book.publication_year
          ? String(book.publication_year)
          : '',
        edition: book.edition || '',
        language: book.language || 'vi',
        page_count: book.page_count
          ? String(book.page_count)
          : '',
        cover_image_url: book.cover_image_url || '',
        author_ids: (book.book_authors || []).map(
          (item: { author: { id: number } }) => item.author.id,
        ),
        category_ids: (book.book_categories || []).map(
          (item: { category: { id: number } }) => item.category.id,
        ),
        copy_count: '1',
        shelf_location: '',
        price: '0',
      });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Không thể tải thông tin đầu sách',
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setForm(initialForm);
    setFormError('');
    setEditingBookId(null);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchBooks(search, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchBooks(search, newPage);
  };

  const updateField = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const toggleSelection = (
    field: 'author_ids' | 'category_ids',
    id: number,
  ) => {
    setForm((previous) => {
      const current = previous[field];

      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      return {
        ...previous,
        [field]: updated,
      };
    });
  };

  const handleSaveBook = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!accessToken) {
      setFormError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    if (!form.title.trim()) {
      setFormError('Vui lòng nhập tên sách.');
      return;
    }

    if (!editingBookId) {
      const copyCount = Number(form.copy_count);
      const price = Number(form.price);

      if (
        !Number.isInteger(copyCount) ||
        copyCount < 1 ||
        copyCount > 500
      ) {
        setFormError('Số lượng bản sao phải từ 1 đến 500.');
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        setFormError('Giá sách không hợp lệ.');
        return;
      }
    }

    if (form.publication_year) {
      const year = Number(form.publication_year);

      if (
        !Number.isInteger(year) ||
        year < 1000 ||
        year > new Date().getFullYear() + 1
      ) {
        setFormError('Năm xuất bản không hợp lệ.');
        return;
      }
    }

    if (form.page_count) {
      const pageCount = Number(form.page_count);

      if (!Number.isInteger(pageCount) || pageCount <= 0) {
        setFormError('Số trang phải là số nguyên lớn hơn 0.');
        return;
      }
    }

    if (form.cover_image_url.trim()) {
      try {
        new URL(form.cover_image_url);
      } catch {
        setFormError('Đường dẫn ảnh bìa không hợp lệ.');
        return;
      }
    }

    const metadataPayload = {
      isbn: form.isbn.trim(),
      title: form.title.trim(),
      summary: form.summary.trim(),
      publisher_id: form.publisher_id
        ? Number(form.publisher_id)
        : null,
      publication_year: form.publication_year
        ? Number(form.publication_year)
        : null,
      edition: form.edition.trim(),
      language: form.language.trim() || 'vi',
      page_count: form.page_count ? Number(form.page_count) : null,
      cover_image_url: form.cover_image_url.trim() || null,
      author_ids: form.author_ids,
      category_ids: form.category_ids,
    };

    const payload = editingBookId
      ? metadataPayload
      : {
          ...metadataPayload,
          copy_count: Number(form.copy_count),
          shelf_location: form.shelf_location.trim(),
          price: Number(form.price),
        };

    setSaving(true);

    try {
      const response = await fetch(
        editingBookId
          ? `${API_URL}/books/${editingBookId}`
          : `${API_URL}/books`,
        {
          method: editingBookId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const validationErrors = result.errors
          ? Object.values(result.errors).flat().join(', ')
          : '';

        throw new Error(
          validationErrors ||
            result.message ||
            (editingBookId
              ? 'Không thể cập nhật đầu sách'
              : 'Không thể thêm sách'),
        );
      }

      const isEditing = Boolean(editingBookId);

      setShowForm(false);
      setForm(initialForm);
      setEditingBookId(null);

      await fetchBooks(search, page);

      alert(
        isEditing
          ? 'Cập nhật đầu sách thành công!'
          : 'Thêm đầu sách thành công!',
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi lưu sách',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deletingBook) return;

    if (!accessToken) {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `${API_URL}/books/${deletingBook.id}`,
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
          result.message || 'Không thể xóa đầu sách này.',
        );
      }

      const remainingBooks = books.length - 1;
      const nextPage =
        remainingBooks === 0 && page > 1 ? page - 1 : page;

      setDeletingBook(null);

      await fetchBooks(search, nextPage);

      alert('Xóa đầu sách thành công!');
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi xóa đầu sách.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = Boolean(editingBookId);

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Quản lý đầu sách</h3>
          <p className="text-muted mb-0">
            Quản lý thông tin đầu sách trong thư viện
          </p>
        </div>

        {canCreate && (
          <button
            className="btn btn-danger"
            onClick={openCreateForm}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Thêm đầu sách
          </button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên sách hoặc ISBN..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-auto">
              <button type="submit" className="btn btn-outline-danger">
                <i className="bi bi-search me-1"></i>
                Tìm kiếm
              </button>
            </div>

            <div className="col-auto">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearch('');
                  fetchBooks('', 1);
                }}
              >
                Làm mới
              </button>
            </div>

            <div className="col-md text-md-end align-self-center">
              <span className="text-muted">
                Tổng số: <strong>{totalBooks}</strong> đầu sách
              </span>
            </div>
          </form>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>STT</th>
                  <th>ISBN</th>
                  <th>Tên sách</th>
                  <th>Tác giả</th>
                  <th>Thể loại</th>
                  <th>Nhà xuất bản</th>
                  <th>Năm XB</th>
                  <th className="text-center">Số bản</th>
                  {(canUpdate || canDelete) && (
                    <th className="text-center">Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={canUpdate || canDelete ? 9 : 8}
                      className="text-center py-4"
                    >
                      <div className="spinner-border spinner-border-sm text-danger me-2"></div>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canUpdate || canDelete ? 9 : 8}
                      className="text-center text-muted py-4"
                    >
                      Không tìm thấy đầu sách nào
                    </td>
                  </tr>
                ) : (
                  books.map((book, index) => (
                    <tr key={book.id}>
                      <td>{(page - 1) * 10 + index + 1}</td>
                      <td>{book.isbn || '—'}</td>
                      <td className="fw-semibold">{book.title}</td>
                      <td>
                        {book.book_authors
                          .map((item) => item.author.name)
                          .join(', ') || '—'}
                      </td>
                      <td>
                        {book.book_categories
                          .map((item) => item.category.name)
                          .join(', ') || '—'}
                      </td>
                      <td>{book.publisher?.name || '—'}</td>
                      <td>{book.publication_year || '—'}</td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">
                          {book.total_copies}
                        </span>
                      </td>

                      {(canUpdate || canDelete) && (
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            {canUpdate && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEditForm(book.id)}
                                title="Sửa đầu sách"
                              >
                                <i className="bi bi-pencil-square me-1"></i>
                                Sửa
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeletingBook(book)}
                                title="Xóa đầu sách"
                              >
                                <i className="bi bi-trash me-1"></i>
                                Xóa
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

          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
              Trang {page} / {totalPages}
            </small>

            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                <i className="bi bi-chevron-left"></i>
                Trước
              </button>

              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
              >
                Sau
                <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
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
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 1055,
            padding: '16px',
          }}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-scrollable"
            style={{
              margin: '0 auto',
              maxHeight: 'calc(100vh - 32px)',
            }}
          >
            <div
              className="modal-content"
              style={{
                maxHeight: 'calc(100vh - 32px)',
              }}
            >
              <form
                onSubmit={handleSaveBook}
                className="d-flex flex-column"
                style={{ minHeight: 0, maxHeight: 'calc(100vh - 32px)' }}
              >
                <div className="modal-header flex-shrink-0">
                  <div>
                    <h5 className="modal-title fw-bold">
                      {isEditing ? 'Sửa thông tin đầu sách' : 'Thêm đầu sách mới'}
                    </h5>
                    <small className="text-muted">
                      {isEditing
                        ? 'Cập nhật thông tin đầu sách trong thư viện'
                        : 'Nhập thông tin sách và số lượng bản sao'}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeForm}
                    disabled={saving}
                  ></button>
                </div>

                <div
                  className="modal-body"
                  style={{
                    overflowY: 'auto',
                    minHeight: 0,
                  }}
                >
                  {formError && (
                    <div className="alert alert-danger">
                      {formError}
                    </div>
                  )}

                  {loadingOptions ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-danger"></div>
                      <p className="mt-2 text-muted">
                        Đang tải dữ liệu...
                      </p>
                    </div>
                  ) : (
                    <>
                      <h6 className="fw-bold text-danger mb-3">
                        1. Thông tin cơ bản
                      </h6>

                      <div className="row g-3">
                        <div className="col-md-8">
                          <label className="form-label">
                            Tên sách <span className="text-danger">*</span>
                          </label>
                          <input
                            name="title"
                            className="form-control"
                            value={form.title}
                            onChange={updateField}
                            maxLength={255}
                            required
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">ISBN</label>
                          <input
                            name="isbn"
                            className="form-control"
                            value={form.isbn}
                            onChange={updateField}
                            maxLength={20}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Nhà xuất bản</label>
                          <select
                            name="publisher_id"
                            className="form-select"
                            value={form.publisher_id}
                            onChange={updateField}
                          >
                            <option value="">-- Chọn nhà xuất bản --</option>
                            {publishers.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Năm xuất bản</label>
                          <input
                            name="publication_year"
                            type="number"
                            className="form-control"
                            min="1000"
                            max={new Date().getFullYear() + 1}
                            value={form.publication_year}
                            onChange={updateField}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Lần xuất bản</label>
                          <input
                            name="edition"
                            className="form-control"
                            value={form.edition}
                            onChange={updateField}
                            maxLength={100}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Ngôn ngữ</label>
                          <input
                            name="language"
                            className="form-control"
                            value={form.language}
                            onChange={updateField}
                            maxLength={20}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Số trang</label>
                          <input
                            name="page_count"
                            type="number"
                            min="1"
                            className="form-control"
                            value={form.page_count}
                            onChange={updateField}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">URL ảnh bìa</label>
                          <input
                            name="cover_image_url"
                            type="url"
                            className="form-control"
                            placeholder="https://..."
                            value={form.cover_image_url}
                            onChange={updateField}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label">Mô tả</label>
                          <textarea
                            name="summary"
                            className="form-control"
                            rows={3}
                            maxLength={10000}
                            value={form.summary}
                            onChange={updateField}
                          />
                        </div>
                      </div>

                      <hr className="my-4" />

                      <h6 className="fw-bold text-danger mb-3">
                        2. Tác giả và thể loại
                      </h6>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Tác giả</label>
                          <div
                            className="border rounded p-3"
                            style={{ maxHeight: 180, overflowY: 'auto' }}
                          >
                            {authors.length === 0 ? (
                              <small className="text-muted">
                                Chưa có dữ liệu tác giả
                              </small>
                            ) : (
                              authors.map((item) => (
                                <div className="form-check" key={item.id}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`author-${item.id}`}
                                    checked={form.author_ids.includes(item.id)}
                                    onChange={() =>
                                      toggleSelection('author_ids', item.id)
                                    }
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`author-${item.id}`}
                                  >
                                    {item.name}
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label">Thể loại</label>
                          <div
                            className="border rounded p-3"
                            style={{ maxHeight: 180, overflowY: 'auto' }}
                          >
                            {categories.length === 0 ? (
                              <small className="text-muted">
                                Chưa có dữ liệu thể loại
                              </small>
                            ) : (
                              categories.map((item) => (
                                <div className="form-check" key={item.id}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`category-${item.id}`}
                                    checked={form.category_ids.includes(item.id)}
                                    onChange={() =>
                                      toggleSelection('category_ids', item.id)
                                    }
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`category-${item.id}`}
                                  >
                                    {item.name}
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {!isEditing ? (
                        <>
                          <hr className="my-4" />

                          <h6 className="fw-bold text-danger mb-3">
                            3. Thông tin bản sao
                          </h6>

                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label">
                                Số lượng bản sao{' '}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                name="copy_count"
                                type="number"
                                className="form-control"
                                min="1"
                                max="500"
                                value={form.copy_count}
                                onChange={updateField}
                                required
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Vị trí kệ</label>
                              <input
                                name="shelf_location"
                                className="form-control"
                                maxLength={100}
                                placeholder="Ví dụ: Kệ A1"
                                value={form.shelf_location}
                                onChange={updateField}
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">
                                Giá mỗi bản (VNĐ)
                              </label>
                              <input
                                name="price"
                                type="number"
                                className="form-control"
                                min="0"
                                step="1000"
                                value={form.price}
                                onChange={updateField}
                              />
                            </div>
                          </div>

                          <div className="alert alert-info mt-3 mb-0">
                            <i className="bi bi-info-circle me-2"></i>
                            Hệ thống sẽ tự động tạo mã vạch riêng cho từng bản sao.
                          </div>
                        </>
                      ) : (
                        <div className="alert alert-info mt-4 mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Chế độ sửa chỉ cập nhật thông tin đầu sách, tác giả và
                          thể loại. Các bản sao và mã vạch hiện tại được giữ nguyên.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-footer flex-shrink-0">
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
                    disabled={saving || loadingOptions}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {isEditing ? 'Cập nhật đầu sách' : 'Lưu đầu sách'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deletingBook && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1060,
            padding: '16px',
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Xác nhận xóa đầu sách
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeletingBook(null)}
                  disabled={deleting}
                ></button>
              </div>

              <div className="modal-body">
                <p>
                  Bạn có chắc chắn muốn xóa đầu sách này không?
                </p>

                <div className="border rounded p-3 bg-light">
                  <div className="fw-semibold">{deletingBook.title}</div>
                  <small className="text-muted">
                    ISBN: {deletingBook.isbn || 'Chưa có'}
                  </small>
                </div>

                <div className="alert alert-warning mt-3 mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Đây là thao tác xóa mềm. Nếu sách đang được mượn hoặc có lượt
                  đặt chỗ hoạt động, hệ thống sẽ từ chối xóa.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setDeletingBook(null)}
                  disabled={deleting}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteBook}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Xác nhận xóa
                    </>
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

export default BooksPage;
