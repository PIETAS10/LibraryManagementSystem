import { Request, Response, NextFunction } from 'express';

// Kiểm tra người dùng có ít nhất một trong các vai trò được yêu cầu
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Người dùng chưa được xác thực
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    // Kiểm tra vai trò
    const hasRole = req.user.roles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này',
      });
    }

    return next();
  };
};

// Kiểm tra người dùng có tất cả các quyền được yêu cầu
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Người dùng chưa được xác thực
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    // Kiểm tra danh sách quyền
    const hasAllPermissions = requiredPermissions.every((permission) =>
      req.user!.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
    }

    return next();
  };
};