
import { Router } from 'express';

import {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from '../../controllers/catalog/author.controller';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';

import {
  createAuthorSchema,
  updateAuthorSchema,
} from '../../validations/catalog/author.validation';

const router = Router();

// Xem danh sách tác giả
router.get('/', getAllAuthors);

// Xem chi tiết tác giả
router.get('/:id', getAuthorById);

// Thêm tác giả
router.post(
  '/',
  authenticateAccessToken,
  requirePermission('authors:manage'),
  validateBody(createAuthorSchema),
  createAuthor,
);

// Cập nhật tác giả
router.put(
  '/:id',
  authenticateAccessToken,
  requirePermission('authors:manage'),
  validateBody(updateAuthorSchema),
  updateAuthor,
);

// Xóa tác giả
router.delete(
  '/:id',
  authenticateAccessToken,
  requirePermission('authors:manage'),
  deleteAuthor,
);

export default router;
