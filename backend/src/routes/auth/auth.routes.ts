import { Router } from 'express';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';

import {
  login,
  refresh,
  logout,
  getMe,
  register,
} from '../../controllers/auth/auth.controller';

import { validateBody } from '../../middlewares/validation.middleware';

import {
  loginSchema,
  registerSchema,
} from '../../validations/auth/auth.validation';

const router = Router();

// Đăng ký độc giả
router.post(
  '/register',
  validateBody(registerSchema),
  register,
);

// Đăng nhập
router.post(
  '/login',
  validateBody(loginSchema),
  login,
);

// Làm mới Access Token
router.post(
  '/refresh',
  refresh,
);

// Đăng xuất
router.post(
  '/logout',
  authenticateAccessToken,
  logout,
);

// Lấy thông tin người dùng hiện tại
router.get(
  '/me',
  authenticateAccessToken,
  getMe,
);

export default router;