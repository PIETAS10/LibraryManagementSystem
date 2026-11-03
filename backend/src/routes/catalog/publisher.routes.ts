
import { Router } from 'express';

import {
  getAllPublishers,
  getPublisherById,
  createPublisher,
  updatePublisher,
  deletePublisher,
} from '../../controllers/catalog/publisher.controller';

import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';

import {
  createPublisherSchema,
  updatePublisherSchema,
} from '../../validations/catalog/publisher.validation';

const router = Router();

// Xem danh sách nhà xuất bản
router.get('/', getAllPublishers);

// Xem chi tiết nhà xuất bản
router.get('/:id', getPublisherById);

// Thêm nhà xuất bản
router.post(
  '/',
  authenticateAccessToken,
  requirePermission('publishers:manage'),
  validateBody(createPublisherSchema),
  createPublisher,
);

// Cập nhật nhà xuất bản
router.put(
  '/:id',
  authenticateAccessToken,
  requirePermission('publishers:manage'),
  validateBody(updatePublisherSchema),
  updatePublisher,
);

// Xóa nhà xuất bản
router.delete(
  '/:id',
  authenticateAccessToken,
  requirePermission('publishers:manage'),
  deletePublisher,
);

export default router;
