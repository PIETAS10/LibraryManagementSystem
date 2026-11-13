
import React, { useEffect, useState } from "react";

interface Book {
  id: string;
  isbn: string | null;
  title: string;
  summary?: string | null;
  publication_year: number | null;
  cover_image_url?: string | null;
  edition?: string | null;
  language?: string | null;
  page_count?: number | null;
  publisher: { name: string } | null;
  book_authors: { author: { name: string } }[];
  book_categories: { category: { name: string } }[];
  total_copies: number;
  available_copies: number;
  book_copies?: {
  id: string;
  status: string;
}[];
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
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ReaderCatalogPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchBooks = async (keyword = search, currentPage = page) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search: keyword,
        page: String(currentPage),
        limit: "12",
      });

      const response = await fetch(`${API_URL}/books?${params}`);
      const result: BooksResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải danh mục sách");
      }

      setBooks(result.data || []);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalBooks(result.pagination.total || 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải danh mục sách"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks("", 1);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchBooks(search, 1);
  };

  const handleReset = () => {
    setSearch("");
    fetchBooks("", 1);
  };

  const handleViewDetail = async (bookId: string) => {
    setDetailLoading(true);
    setDetailError("");
    setSelectedBook(null);

    try {
      const response = await fetch(`${API_URL}/books/${bookId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải chi tiết sách");
      }

      setSelectedBook(result.data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải chi tiết sách"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedBook(null);
    setDetailError("");
  };

  return (
    <div className="container-fluid py-3">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Tra cứu sách</h3>
        <p className="text-muted mb-0">
          Tìm kiếm và xem thông tin các đầu sách trong thư viện
        </p>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-2">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tên sách hoặc ISBN..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-auto">
              <button type="submit" className="btn btn-danger">
                <i className="bi bi-search me-2"></i>
                Tìm kiếm
              </button>
            </div>

            <div className="col-auto">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleReset}
              >
                Làm mới
              </button>
            </div>
          </form>

          <div className="mt-3 text-muted small">
            Tìm thấy <strong>{totalBooks}</strong> đầu sách
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Danh sách sách */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger"></div>
          <p className="text-muted mt-2">Đang tải danh mục sách...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-book display-4"></i>
            <p className="mt-3 mb-0">
              Không tìm thấy đầu sách phù hợp.
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {books.map((book) => (
            <div
              className="col-12 col-sm-6 col-lg-4 col-xl-3"
              key={book.id}
            >
              <div className="card h-100 border-0 shadow-sm">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    className="card-img-top reader-book-cover"
                    alt={book.title}
                    style={{
                      height: "220px",
                      objectFit: "contain",
                      padding: "12px",
                    }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center bg-light"
                    style={{ height: "220px" }}
                  >
                    <i className="bi bi-book text-secondary display-3"></i>
                  </div>
                )}

                <div className="card-body d-flex flex-column">
                  <h6 className="fw-bold">{book.title}</h6>

                  <p className="text-muted small mb-2">
                    {book.book_authors
                      .map((item) => item.author.name)
                      .join(", ") || "Chưa cập nhật tác giả"}
                  </p>

                  <div className="small mb-2">
                    <div>
                      <strong>ISBN:</strong> {book.isbn || "—"}
                    </div>

                    <div>
                      <strong>Nhà xuất bản:</strong>{" "}
                      {book.publisher?.name || "—"}
                    </div>

                    <div>
                      <strong>Năm xuất bản:</strong>{" "}
                      {book.publication_year || "—"}
                    </div>
                  </div>

                  <div className="mb-2">
                    {book.book_categories.map((item, index) => (
                      <span
                        className="badge bg-light text-dark border me-1 mb-1"
                        key={`${book.id}-${index}`}
                      >
                        {item.category.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-2 border-top">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">
                        Tổng số bản:
                      </span>
                      <strong>{book.total_copies ?? 0}</strong>
                    </div>

                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted small">
                        Có thể mượn:
                      </span>

                      <span
                        className={`badge ${
                          (book.available_copies ?? 0) > 0
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {book.available_copies ?? 0} bản
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm w-100"
                      onClick={() => handleViewDetail(book.id)}
                    >
                      <i className="bi bi-eye me-2"></i>
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phân trang */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        <small className="text-muted">
          Trang {page} / {totalPages}
        </small>

        <div className="btn-group">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchBooks(search, page - 1)}
          >
            <i className="bi bi-chevron-left me-1"></i>
            Trước
          </button>

          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchBooks(search, page + 1)}
          >
            Sau
            <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>

      {/* Cửa sổ chi tiết sách */}
      {(detailLoading || detailError || selectedBook) && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            zIndex: 2000,
            padding: "15px",
          }}
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded shadow-lg w-100"
            style={{
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="fw-bold mb-0">Chi tiết sách</h5>

              <button
                type="button"
                className="btn-close"
                onClick={closeDetail}
              ></button>
            </div>

            {detailLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger"></div>
                <p className="text-muted mt-2">
                  Đang tải thông tin sách...
                </p>
              </div>
            ) : detailError ? (
              <div className="alert alert-danger m-3">
                {detailError}
              </div>
            ) : selectedBook ? (
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-md-4">
                    {selectedBook.cover_image_url ? (
                      <img
                        src={selectedBook.cover_image_url}
                        alt={selectedBook.title}
                        className="img-fluid rounded border w-100 reader-book-cover"
                        style={{
                          maxHeight: "350px",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-light rounded"
                        style={{ height: "280px" }}
                      >
                        <i className="bi bi-book display-1 text-secondary"></i>
                      </div>
                    )}
                  </div>

                  <div className="col-md-8">
                    <h4 className="fw-bold mb-3">
                      {selectedBook.title}
                    </h4>

                    <p className="text-muted">
                      {selectedBook.summary || "Chưa có mô tả cho sách này."}
                    </p>

                    <div className="small">
                      <p>
                        <strong>ISBN:</strong>{" "}
                        {selectedBook.isbn || "—"}
                      </p>

                      <p>
                        <strong>Tác giả:</strong>{" "}
                        {selectedBook.book_authors
                          ?.map((item) => item.author.name)
                          .join(", ") || "Chưa cập nhật"}
                      </p>

                      <p>
                        <strong>Nhà xuất bản:</strong>{" "}
                        {selectedBook.publisher?.name || "—"}
                      </p>

                      <p>
                        <strong>Năm xuất bản:</strong>{" "}
                        {selectedBook.publication_year || "—"}
                      </p>

                      <p>
                        <strong>Lần xuất bản:</strong>{" "}
                        {selectedBook.edition || "—"}
                      </p>

                      <p>
                        <strong>Ngôn ngữ:</strong>{" "}
                        {selectedBook.language || "—"}
                      </p>

                      <p>
                        <strong>Số trang:</strong>{" "}
                        {selectedBook.page_count || "—"}
                      </p>

                      <div className="mb-3">
                        <strong>Thể loại:</strong>
                        <div className="mt-2">
                          {selectedBook.book_categories?.length ? (
                            selectedBook.book_categories.map(
                              (item, index) => (
                                <span
                                  key={index}
                                  className="badge bg-light text-dark border me-1 mb-1"
                                >
                                  {item.category.name}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-muted">Chưa cập nhật</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr />

                <h6 className="fw-bold mb-3">
                  Tình trạng sách trong thư viện
                </h6>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="bg-light rounded p-3 text-center">
                      <div className="text-muted small">
                        Tổng số bản
                      </div>
                      <h3 className="fw-bold mb-0">
                        {selectedBook.total_copies ??
                          selectedBook.book_copies?.length ??
                          0}
                      </h3>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="bg-light rounded p-3 text-center">
                      <div className="text-muted small">
                        Có thể mượn
                      </div>
                      <h3
                        className={`fw-bold mb-0 ${
                          (selectedBook.available_copies ?? 0) > 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {selectedBook.available_copies ?? 0}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  {(selectedBook.available_copies ?? 0) > 0 ? (
                    <div className="alert alert-success mb-0">
                      <i className="bi bi-check-circle me-2"></i>
                      Hiện có sách sẵn sàng cho mượn. Vui lòng liên hệ
                      thủ thư để thực hiện giao dịch.
                    </div>
                  ) : (
                    <div className="alert alert-warning mb-0">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      Hiện chưa có bản sách nào sẵn sàng cho mượn.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="p-3 border-top text-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDetail}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderCatalogPage;
