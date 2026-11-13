import { API_URL } from './auth.service';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  success: boolean;
  message: string;
  data?: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
}

const request = async (
  path: string,
  accessToken: string,
  method = 'GET',
) => {
  const response = await fetch(`${API_URL}/notifications${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Không thể cập nhật thông báo';
    try {
      const result = (await response.json()) as { message?: string };
      message = result.message || message;
    } catch {
      // Dùng thông báo mặc định khi máy chủ không trả JSON.
    }
    throw new Error(message);
  }

  return response;
};

export const getNotificationsApi = async (accessToken: string) => {
  const response = await request('/', accessToken);
  const result = (await response.json()) as NotificationListResponse;

  if (!result.data) {
    throw new Error('Dữ liệu thông báo từ máy chủ không hợp lệ');
  }

  return result.data;
};

export const markNotificationReadApi = async (
  accessToken: string,
  notificationId: string,
) => {
  await request(`/${encodeURIComponent(notificationId)}/read`, accessToken, 'PATCH');
};

export const markAllNotificationsReadApi = async (accessToken: string) => {
  await request('/read-all', accessToken, 'PATCH');
};
