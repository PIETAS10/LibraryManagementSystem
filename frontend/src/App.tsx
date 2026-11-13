
import React, { useState, useEffect, useRef, useCallback } from "react";
import ActiveBorrowingsPage from "./pages/ActiveBorrowingsPage";
import ReaderBorrowingHistoryPage from "./pages/ReaderBorrowingHistoryPage";
import ReaderCatalogPage from "./pages/ReaderCatalogPage";
import ReaderBorrowedBooksPage from "./pages/ReaderBorrowedBooksPage";
import ReaderFinesPage from "./pages/ReaderFinesPage";
import CirculationPage from "./pages/Circulation/CirculationPage";
import BooksPage from "./pages/Books/BooksPage";
import BookCopiesPage from "./pages/BookCopies/BookCopiesPage";
import Dashboard from "./pages/Dashboard";
import ReaderDashboard from "./pages/ReaderDashboard";
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Register/RegisterPage";
import CategoriesPage from "./pages/Categories/CategoriesPage";
import AuthorsPage from "./pages/Authors/AuthorsPage";
import PublishersPage from "./pages/Publishers/PublishersPage";
import ReadersPage from "./pages/Readers/ReadersPage";
import FinesPage from "./pages/Fines/FinesPage";
import EmployeesPage from "./pages/Employees/EmployeesPage";
import ReportsPage from "./pages/Reports/ReportsPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import { useAuth } from "./context/AuthContext";
import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "./services/notification.service";
import type { NotificationItem } from "./services/notification.service";

import "./App.css";

type Role = "ADMIN" | "LIBRARIAN" | "READER";
type DashboardAction = "createBook" | "createReader";

interface MenuItem {
  icon: string;
  label: string;
}

interface MenuGroup {
  title: string;
  allowedRoles: Role[];
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "TỔNG QUAN",
    allowedRoles: ["ADMIN", "LIBRARIAN", "READER"],
    items: [
      { icon: "bi bi-grid", label: "Tổng quan" },
    ],
  },
  {
    title: "TRA CỨU",
    allowedRoles: ["READER"],
    items: [
      { icon: "bi bi-search", label: "Tra cứu sách" },
      { icon: "bi bi-book-half", label: "Sách đang mượn" },
      { icon: "bi bi-clock-history", label: "Lịch sử mượn trả" },
      { icon: "bi bi-cash-coin", label: "Khoản phạt" },
    ],
  },
  {
    title: "QUẢN LÝ THƯ VIỆN",
    allowedRoles: ["ADMIN", "LIBRARIAN"],
    items: [
      { icon: "bi bi-book", label: "Quản lý sách" },
      { icon: "bi bi-upc-scan", label: "Quản lý bản sách" },
      { icon: "bi bi-tags", label: "Thể loại sách" },
      { icon: "bi bi-person-lines-fill", label: "Tác giả" },
      { icon: "bi bi-buildings", label: "Nhà xuất bản" },
      { icon: "bi bi-people", label: "Độc giả" },
      { icon: "bi bi-person-badge", label: "Nhân viên" },
    ],
  },
  {
    title: "NGHIỆP VỤ",
    allowedRoles: ["ADMIN", "LIBRARIAN"],
    items: [
      { icon: "bi bi-arrow-left-right", label: "Mượn và trả sách" },
      {
        icon: "bi bi-journal-arrow-up",
        label: "Theo dõi sách đang mượn",
      },
      { icon: "bi bi-cash-stack", label: "Quản lý tiền phạt" },
    ],
  },
  {
    title: "HỆ THỐNG",
    allowedRoles: ["ADMIN"],
    items: [
      { icon: "bi bi-bar-chart", label: "Báo cáo thống kê" },
      { icon: "bi bi-gear", label: "Cài đặt" },
    ],
  },
];

const App: React.FC = () => {
  const { user, loading, logout, accessToken } = useAuth();

  const [activePage, setActivePage] = useState("Tổng quan");
  const [dashboardAction, setDashboardAction] =
    useState<DashboardAction | null>(null);
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notificationRef = useRef<HTMLDivElement>(null);

  // Đọc chế độ giao diện đã lưu trước đó.
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("library-theme") === "dark";
  });

  // Áp dụng giao diện và lưu lựa chọn vào localStorage.
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("library-theme", theme);
  }, [darkMode]);

  // Bật hoặc tắt chế độ tối.
  const toggleDarkMode = () => {
    setDarkMode((previous) => !previous);
  };

  const loadNotifications = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await getNotificationsApi(accessToken);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setNotificationError("");
    } catch (error) {
      console.error("Không thể tải thông báo:", error);
      setNotificationError(
        error instanceof Error ? error.message : "Không thể tải thông báo",
      );
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [accessToken, loadNotifications]);

  useEffect(() => {
    if (!notificationOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationOpen]);

  const markAllAsRead = async () => {
    if (!accessToken) return;

    try {
      await markAllNotificationsReadApi(accessToken);
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true })),
      );
      setUnreadCount(0);
      setNotificationError("");
    } catch (error) {
      console.error("Không thể đánh dấu thông báo đã đọc:", error);
      setNotificationError(
        error instanceof Error ? error.message : "Không thể cập nhật thông báo",
      );
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!accessToken) return;

    try {
      if (!notification.is_read) {
        await markNotificationReadApi(accessToken, notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      const pageByLink: Record<string, string> = {
        "/readers": "Độc giả",
        "/fines": "Quản lý tiền phạt",
        "/my-borrowed-books": "Sách đang mượn",
      };
      const targetPage =
        notification.link_url === "/fines" && isReaderOnly
          ? "Khoản phạt"
          : notification.link_url
            ? pageByLink[notification.link_url]
            : undefined;

      if (targetPage && allowedPages.includes(targetPage)) {
        setActivePage(targetPage);
      }
      setNotificationOpen(false);
      setNotificationError("");
    } catch (error) {
      console.error("Không thể mở thông báo:", error);
      setNotificationError(
        error instanceof Error ? error.message : "Không thể cập nhật thông báo",
      );
    }
  };

  const userRoles: string[] = user?.roles ?? [];

  const hasRole = (role: Role): boolean => {
    return userRoles.includes(role);
  };

  const isReaderOnly =
    hasRole("READER") &&
    !hasRole("ADMIN") &&
    !hasRole("LIBRARIAN");

  const visibleMenuGroups = menuGroups.filter((group) =>
    group.allowedRoles.some((role) => hasRole(role))
  );

  const allowedPages = visibleMenuGroups.flatMap((group) =>
    group.items.map((item) => item.label)
  );

  const handleDashboardNavigate = (
    page: string,
    action?: DashboardAction,
  ) => {
    if (!allowedPages.includes(page)) return;
    setDashboardAction(action ?? null);
    setActivePage(page);
  };

  const clearDashboardAction = () => setDashboardAction(null);

  useEffect(() => {
    if (user && !allowedPages.includes(activePage)) {
      setActivePage("Tổng quan");
    }
  }, [user, activePage, allowedPages.join("|")]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-danger"></div>
          <p className="mt-3 text-muted">
            Đang kiểm tra phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === "register") {
      return (
        <RegisterPage
          onBackToLogin={() => setAuthScreen("login")}
        />
      );
    }

    return (
      <LoginPage
        onRegister={() => setAuthScreen("register")}
      />
    );
  }

  const renderPage = () => {
    if (!allowedPages.includes(activePage)) {
      return isReaderOnly ? (
        <ReaderDashboard />
      ) : (
        <Dashboard onNavigate={handleDashboardNavigate} />
      );
    }

    if (isReaderOnly) {
      switch (activePage) {
        case "Tổng quan":
          return <ReaderDashboard />;

        case "Tra cứu sách":
          return <ReaderCatalogPage />;

        case "Sách đang mượn":
          return <ReaderBorrowedBooksPage />;

        case "Lịch sử mượn trả":
          return <ReaderBorrowingHistoryPage />;

        case "Khoản phạt":
          return <ReaderFinesPage />;

        default:
          return <ReaderDashboard />;
      }
    }

    switch (activePage) {
      case "Tổng quan":
        return <Dashboard onNavigate={handleDashboardNavigate} />;

      case "Quản lý sách":
        return (
          <BooksPage
            openCreateOnMount={dashboardAction === "createBook"}
            onCreateOpened={clearDashboardAction}
          />
        );

      case "Quản lý bản sách":
        return <BookCopiesPage />;

      case "Thể loại sách":
        return <CategoriesPage />;

      case "Tác giả":
        return <AuthorsPage />;

      case "Nhà xuất bản":
        return <PublishersPage />;

      case "Độc giả":
        return (
          <ReadersPage
            openCreateOnMount={dashboardAction === "createReader"}
            onCreateOpened={clearDashboardAction}
          />
        );

      case "Nhân viên":
        return <EmployeesPage />;

      case "Mượn và trả sách":
        return <CirculationPage />;

      case "Theo dõi sách đang mượn":
        return <ActiveBorrowingsPage />;

      case "Quản lý tiền phạt":
        return <FinesPage />;

      case "Báo cáo thống kê":
        return <ReportsPage />;

      case "Cài đặt":
        return (
          <SettingsPage
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        );

      default:
        return (
          <div className="dashboard-content">
            <h2>{activePage}</h2>
            <p>Chức năng đang được phát triển.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <i className="bi bi-book-half"></i>
          </div>

          <div>
            <h5>PTIT Library</h5>
            <span>HỆ THỐNG THƯ VIỆN</span>
          </div>
        </div>

        <div className="sidebar-menu">
          {visibleMenuGroups.map((group) => (
            <div className="menu-group" key={group.title}>
              <p className="menu-heading">{group.title}</p>

              {group.items.map((item) => (
                <button
                  className={`menu-item ${
                    activePage === item.label ? "active" : ""
                  }`}
                  key={item.label}
                  type="button"
                  onClick={() => setActivePage(item.label)}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <i className="bi bi-headset"></i>
          <span>Hỗ trợ hệ thống</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb-text">
              Trang chủ / {activePage}
            </span>
          </div>

          <div className="topbar-right">
            <div className="notification-menu" ref={notificationRef}>
              <button
                className="header-icon"
                type="button"
                aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
                aria-expanded={notificationOpen}
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <section
                  className="notification-dropdown"
                  aria-label="Danh sách thông báo"
                >
                  <div className="notification-heading">
                    <strong>Thông báo</strong>
                    <button
                      type="button"
                      className="notification-mark-all"
                      disabled={unreadCount === 0}
                      onClick={() => void markAllAsRead()}
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>

                  {notificationError && (
                    <p className="notification-state notification-error" role="alert">
                      {notificationError}
                    </p>
                  )}

                  {notifications.length === 0 ? (
                    <p className="notification-state">
                      Chưa có thông báo nào.
                    </p>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <button
                          type="button"
                          className={`notification-item ${notification.is_read ? "" : "unread"}`}
                          key={notification.id}
                          onClick={() => void openNotification(notification)}
                        >
                          <span className="notification-item-icon">
                            <i
                              className={
                                notification.type === "FINE_INCURRED"
                                  ? "bi bi-cash-coin"
                                  : notification.type === "ACCOUNT_APPROVED"
                                    ? "bi bi-person-check"
                                    : "bi bi-info-circle"
                              }
                            ></i>
                          </span>
                          <span className="notification-item-content">
                            <strong>{notification.title}</strong>
                            <span>{notification.message}</span>
                            <time dateTime={notification.created_at}>
                              {new Date(notification.created_at).toLocaleString("vi-VN")}
                            </time>
                          </span>
                          {!notification.is_read && (
                            <span className="notification-unread-dot" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="user-profile">
              <div className="avatar">
                {user.full_name?.charAt(0).toUpperCase() || "U"}
              </div>

              <div className="user-info">
                <strong>{user.full_name}</strong>
                <span>{user.roles.join(", ")}</span>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary ms-3"
                onClick={() => void logout()}
                title="Đăng xuất"
              >
                <i className="bi bi-box-arrow-right"></i>
                <span className="ms-1">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
};

export default App;
