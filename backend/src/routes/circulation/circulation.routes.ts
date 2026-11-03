
import { Router } from 'express';
import * as circulationController from '../../controllers/circulation/circulation.controller';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';

const router = Router();

// Tất cả API đều yêu cầu đăng nhập
router.use(authenticateAccessToken);

// ======================================================
// API DÀNH CHO ĐỘC GIẢ (READER)
// ======================================================

// Lấy danh sách sách đang mượn của độc giả đăng nhập
router.get(
  '/my-borrowed-books',
  requireRole('READER'),
  circulationController.getMyBorrowedBooks,
);

// Lấy lịch sử mượn trả của độc giả đăng nhập
router.get(
  '/my-history',
  requireRole('READER'),
  circulationController.getMyBorrowingHistory,
);

// ======================================================
// API DÀNH CHO ADMIN / LIBRARIAN
// ======================================================

// Xem toàn bộ sách đang được độc giả mượn
router.get(
  '/active-borrowings',
  requireRole('ADMIN', 'LIBRARIAN'),
  circulationController.getAllActiveBorrowings,
);

// Tra cứu độc giả bằng mã thẻ
router.get(
  '/readers/:cardCode',
  requireRole('ADMIN', 'LIBRARIAN'),
  circulationController.getReaderByCardCode,
);

// Tra cứu bản sách bằng mã vạch
router.get(
  '/copies/:barcode',
  requireRole('ADMIN', 'LIBRARIAN'),
  circulationController.getCopyByBarcode,
);

// Tạo phiếu mượn sách
router.post(
  '/borrow',
  requireRole('ADMIN', 'LIBRARIAN'),
  circulationController.createBorrowing,
);

// Trả sách
router.post(
  '/return',
  requireRole('ADMIN', 'LIBRARIAN'),
  circulationController.returnBook,
);

export default router;
