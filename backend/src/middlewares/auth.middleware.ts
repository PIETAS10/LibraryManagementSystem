import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import prisma from '../config/db';

// Kiểu dữ liệu cần có trong Access Token
interface AccessTokenPayload extends JwtPayload {
  sub: string;
  sid: string;
  ver: number;
}

// Middleware xác thực người dùng
export const authenticateAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Lấy Access Token từ Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục',
      });
    }

    const accessToken = authHeader.split(' ')[1];

    // 2. Kiểm tra JWT Secret
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!accessSecret) {
      console.error('JWT_ACCESS_SECRET chưa được cấu hình');

      return res.status(500).json({
        success: false,
        message: 'Lỗi cấu hình máy chủ',
      });
    }

    // 3. Xác minh chữ ký và thời hạn Access Token
    const decoded = jwt.verify(
      accessToken,
      accessSecret,
    ) as AccessTokenPayload;

    // 4. Kiểm tra các thông tin bắt buộc trong token
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.sid !== 'string' ||
      typeof decoded.ver !== 'number'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Access Token không hợp lệ',
      });
    }

    // 5. Kiểm tra phiên đăng nhập trong database
    const session = await prisma.refreshToken.findUnique({
      where: {
        id: decoded.sid,
      },
      include: {
        user: {
          include: {
            user_roles: {
              include: {
                role: {
                  include: {
                    role_permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.is_revoked ||
      session.expires_at <= new Date() ||
      session.user_id !== decoded.sub
    ) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không còn hiệu lực',
      });
    }

    const user = session.user;

    // 6. Kiểm tra trạng thái tài khoản
    if (
      user.status !== 'ACTIVE' ||
      user.deleted_at !== null ||
      user.token_version !== decoded.ver
    ) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa',
      });
    }

    // 7. Lấy danh sách vai trò hiện tại từ database
    const roles = user.user_roles.map(
      (userRole) => userRole.role.code,
    );

    // 8. Lấy danh sách quyền hiện tại từ database
    const permissions = [
      ...new Set(
        user.user_roles.flatMap((userRole) =>
          userRole.role.role_permissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    ];

    // 9. Gắn thông tin xác thực vào Request
    req.user = {
      id: user.id,
      sessionId: session.id,
      tokenVersion: user.token_version,
      roles,
      permissions,
    };

    // Cho phép request đi tiếp
    return next();
  } catch (error) {
    // JWT hết hạn, sai chữ ký hoặc lỗi xác thực
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        success: false,
        message: 'Access Token không hợp lệ hoặc đã hết hạn',
      });
    }

    console.error('Authentication middleware error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xác thực người dùng',
    });
  }
};