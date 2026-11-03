import { Router } from 'express';

import * as bookCopyController from '../../controllers/catalog/book-copy.controller';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';

import {
  createBookCopySchema,
  updateBookCopySchema,
} from '../../validations/catalog/book-copy.validation';

const router = Router();

// Xem danh sách và chi tiết bản sách
router.get('/', bookCopyController.getAllBookCopies);
router.get('/:id', bookCopyController.getBookCopyById);

// Các chức năng quản lý yêu cầu quyền copies:manage
router.post(
  '/',
  authenticateAccessToken,
  requirePermission('copies:manage'),
  validateBody(createBookCopySchema),
  bookCopyController.createBookCopy,
);

router.put(
  '/:id',
  authenticateAccessToken,
  requirePermission('copies:manage'),
  validateBody(updateBookCopySchema),
  bookCopyController.updateBookCopy,
);

router.delete(
  '/:id',
  authenticateAccessToken,
  requirePermission('copies:manage'),
  bookCopyController.deleteBookCopy,
);

export default router;