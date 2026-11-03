
import { Router } from 'express';

import * as categoryController from '../../controllers/catalog/category.controller';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import { validateParams } from '../../middlewares/params-validation.middleware';

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from '../../validations/catalog/category.validation';

const router = Router();

// GET: Lấy danh sách thể loại (công khai)
router.get('/', categoryController.getAllCategories);

// GET: Lấy chi tiết thể loại
router.get(
  '/:id',
  validateParams(categoryIdSchema),
  categoryController.getCategoryById,
);

// POST: Tạo thể loại mới
router.post(
  '/',
  authenticateAccessToken,
  requirePermission('categories:manage'),
  validateBody(createCategorySchema),
  categoryController.createCategory,
);

// PUT: Cập nhật thể loại
router.put(
  '/:id',
  authenticateAccessToken,
  requirePermission('categories:manage'),
  validateParams(categoryIdSchema),
  validateBody(updateCategorySchema),
  categoryController.updateCategory,
);

// DELETE: Xóa thể loại
router.delete(
  '/:id',
  authenticateAccessToken,
  requirePermission('categories:manage'),
  validateParams(categoryIdSchema),
  categoryController.deleteCategory,
);

export default router;
