
import { Router } from 'express';

import {
  getAllReaders,
  getReaderById,
  createReader,
  updateReader,
  approveReader,
  rejectReader,
  lockReader,
  unlockReader,
  deleteReader,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  lockEmployee,
  unlockEmployee,
} from '../../controllers/users/user.controller';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import {
  requirePermission,
  requireRole,
} from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';

import {
  createReaderSchema,
  updateReaderSchema,
  rejectReaderSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
} from '../../validations/users/user.validation';

const router = Router();

// Tất cả API người dùng đều yêu cầu đăng nhập
router.use(authenticateAccessToken);

// ==========================================
// QUẢN LÝ ĐỘC GIẢ
// ==========================================

router.get('/readers', requirePermission('users:view'), getAllReaders);

router.get('/readers/:id', requirePermission('users:view'), getReaderById);

router.post(
  '/readers',
  requirePermission('users:create'),
  validateBody(createReaderSchema),
  createReader,
);

router.put(
  '/readers/:id',
  requirePermission('users:update'),
  validateBody(updateReaderSchema),
  updateReader,
);

router.patch(
  '/readers/:id/approve',
  requirePermission('users:approve'),
  approveReader,
);

router.patch(
  '/readers/:id/reject',
  requirePermission('users:approve'),
  validateBody(rejectReaderSchema),
  rejectReader,
);

router.patch(
  '/readers/:id/lock',
  requirePermission('users:lock'),
  lockReader,
);

router.patch(
  '/readers/:id/unlock',
  requirePermission('users:lock'),
  unlockReader,
);

// Chỉ ADMIN được xóa tài khoản độc giả
router.delete(
  '/readers/:id',
  requireRole('ADMIN'),
  deleteReader,
);

// ==========================================
// QUẢN LÝ NHÂN VIÊN
// ADMIN VÀ LIBRARIAN ĐƯỢC XEM DANH SÁCH
// CHỈ ADMIN ĐƯỢC THAO TÁC
// ==========================================

router.get(
  '/employees',
  requireRole('ADMIN', 'LIBRARIAN'),
  getAllEmployees,
);

router.post(
  '/employees',
  requireRole('ADMIN'),
  validateBody(createEmployeeSchema),
  createEmployee,
);

router.put(
  '/employees/:id',
  requireRole('ADMIN'),
  validateBody(updateEmployeeSchema),
  updateEmployee,
);

router.patch('/employees/:id/lock', requireRole('ADMIN'), lockEmployee);

router.patch('/employees/:id/unlock', requireRole('ADMIN'), unlockEmployee);

export default router;
