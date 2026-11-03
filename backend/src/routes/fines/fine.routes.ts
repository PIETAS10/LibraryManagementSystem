import { Router } from 'express';
import * as fineController from '../../controllers/fines/fine.controller';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';

const router = Router();

// Tất cả API tiền phạt đều yêu cầu đăng nhập
router.use(authenticateAccessToken);

// READER: chỉ xem tiền phạt của bản thân
router.get(
  '/my-fines',
  requireRole('READER'),
  fineController.getMyFines,
);

// ADMIN và LIBRARIAN: xem toàn bộ tiền phạt
router.get(
  '/',
  requireRole('ADMIN', 'LIBRARIAN'),
  fineController.getAllFines,
);

// ADMIN và LIBRARIAN: thu tiền phạt
router.patch(
  '/:id/pay',
  requireRole('ADMIN', 'LIBRARIAN'),
  fineController.payFine,
);

// ADMIN và LIBRARIAN: miễn tiền phạt
router.patch(
  '/:id/waive',
  requireRole('ADMIN', 'LIBRARIAN'),
  fineController.waiveFine,
);

export default router;