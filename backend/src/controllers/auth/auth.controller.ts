
import { Request, Response } from 'express';

import * as authService from '../../services/auth/auth.service';
import { AuthError } from '../../services/auth/auth.service';

// Cấu hình cookie lưu Refresh Token
const getRefreshCookieOptions = () => {
  const maxAge =
    Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) ||
    7 * 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge,
  };
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Gọi Auth Service xử lý đăng nhập
    const result = await authService.login(
      email,
      password,
      req.ip,
      req.get('user-agent'),
    );

    // Lưu Refresh Token trong HttpOnly Cookie
    res.cookie(
      'refreshToken',
      result.refreshToken,
      getRefreshCookieOptions(),
    );

    // Chỉ trả Access Token và thông tin người dùng
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Login controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập',
    });
  }
};
// Làm mới Access Token bằng Refresh Token trong cookie
export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy Refresh Token',
      });
    }

    const result = await authService.refreshSession(
      refreshToken,
      req.ip,
      req.get('user-agent'),
    );

    // Gửi Refresh Token mới vào cookie HttpOnly
    res.cookie(
      'refreshToken',
      result.refreshToken,
      getRefreshCookieOptions(),
    );

    return res.status(200).json({
      success: true,
      message: 'Làm mới phiên đăng nhập thành công',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Refresh controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi làm mới phiên đăng nhập',
    });
  }
};
// Đăng xuất khỏi phiên hiện tại
export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    // Thu hồi phiên đăng nhập hiện tại
    await authService.logout(req.user.sessionId);

    // Xóa Refresh Token khỏi cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công',
    });
  } catch (error) {
    console.error('Logout controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng xuất',
    });
  }
};
// Lấy thông tin người dùng đang đăng nhập
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: {
        ...user,
        roles: req.user.roles,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Get current user controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy thông tin người dùng',
    });
  }
};

// Đăng ký tài khoản độc giả
export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.registerReader(req.body);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng chờ thư viện duyệt tài khoản.',
      data: user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Register controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng ký tài khoản',
    });
  }
};