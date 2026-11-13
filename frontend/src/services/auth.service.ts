
export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  status?: string;
  created_at?: string;
  roles: string[];
  permissions: string[];
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: Partial<AuthUser>;
  };
}

interface MeResponse {
  success: boolean;
  message: string;
  data?: AuthUser;
}

interface ApiError {
  success: false;
  message: string;
}

const getErrorMessage = async (
  response: Response,
): Promise<string> => {
  try {
    const result = (await response.json()) as ApiError;
    return result.message || 'Đã xảy ra lỗi';
  } catch {
    return 'Không thể kết nối đến máy chủ';
  }
};

// Đăng nhập
export const loginApi = async (
  email: string,
  password: string,
): Promise<{ accessToken: string; user: Partial<AuthUser> }> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result = (await response.json()) as AuthResponse;

  if (!result.data?.accessToken || !result.data.user) {
    throw new Error('Dữ liệu đăng nhập từ máy chủ không hợp lệ');
  }

  return result.data;
};

// Làm mới Access Token bằng Refresh Token cookie
export const refreshApi = async (): Promise<string> => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result = (await response.json()) as AuthResponse;

  if (!result.data?.accessToken) {
    throw new Error('Không thể làm mới phiên đăng nhập');
  }

  return result.data.accessToken;
};

// Lấy thông tin tài khoản và quyền
export const getMeApi = async (
  accessToken: string,
): Promise<AuthUser> => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result = (await response.json()) as MeResponse;

  if (!result.data) {
    throw new Error('Không thể lấy thông tin người dùng');
  }

  return result.data;
};

// Đăng xuất
export const logoutApi = async (
  accessToken: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
};
// Đăng ký tài khoản độc giả
export interface RegisterReaderData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  password: string;
  confirm_password: string;
}

export const registerReaderApi = async (
  data: RegisterReaderData,
): Promise<string> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result = (await response.json()) as {
    success: boolean;
    message: string;
  };

  return result.message || 'Đăng ký thành công';
};