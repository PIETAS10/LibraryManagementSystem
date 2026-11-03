import { updateBookSchema } from '../../validations/catalog/book.validation';
import { Router } from 'express';
import * as bookController from '../../controllers/catalog/book.controller';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validation.middleware';
import { createBookSchema } from '../../validations/catalog/book.validation';

const router = Router();

// Lấy danh sách sách
router.get('/', bookController.getAllBooks);

// Lấy chi tiết sách
router.get('/:id', bookController.getBookById);

// Thêm sách - yêu cầu đăng nhập và quyền books:create
router.post(
  '/',
  authenticateAccessToken,
  requirePermission('books:create'),
  validateBody(createBookSchema),
  bookController.createBook,
);
// Cập nhật sách - yêu cầu quyền books:update
router.put(
  '/:id',
  authenticateAccessToken,
  requirePermission('books:update'),
  validateBody(updateBookSchema),
  bookController.updateBook,
);
// Xóa mềm đầu sách
router.delete(
  '/:id',
  authenticateAccessToken,
  requirePermission('books:delete'),
  bookController.deleteBook,
);

export default router;