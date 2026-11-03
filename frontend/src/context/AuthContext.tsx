
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { AuthUser } from '../services/auth.service';

import {
  getMeApi,
  loginApi,
  logoutApi,
  refreshApi,
} from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục phiên đăng nhập khi tải lại trang
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const token = await refreshApi();

        if (!active) return;

        setAccessToken(token);

        const currentUser = await getMeApi(token);

        if (!active) return;

        setUser(currentUser);
      } catch {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Đăng nhập
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginApi(email, password);

      setAccessToken(result.accessToken);

      try {
        const currentUser = await getMeApi(result.accessToken);
        setUser(currentUser);
      } catch (error) {
        setAccessToken(null);
        setUser(null);

        try {
          await logoutApi(result.accessToken);
        } catch {
          // Không làm mất lỗi đăng nhập ban đầu
        }

        throw error;
      }
    },
    [],
  );

  // Đăng xuất
  const logout = useCallback(async () => {
    const token = accessToken;

    setAccessToken(null);
    setUser(null);

    if (token) {
      try {
        await logoutApi(token);
      } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
      }
    }
  }, [accessToken]);

  // Kiểm tra quyền
  const hasPermission = useCallback(
    (permission: string) => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook sử dụng thông tin đăng nhập
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }

  return context;
};
