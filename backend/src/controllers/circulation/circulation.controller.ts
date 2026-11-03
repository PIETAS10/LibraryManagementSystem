import { Request, Response } from 'express';

import * as circulationService from '../../services/circulation/circulation.service';

import {
  createBorrowingSchema,
  returnBookSchema,
} from '../../validations/circulation/circulation.validation';

// Danh sách sách đang mượn của tài khoản đăng nhập
export const getMyBorrowedBooks = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const books = await circulationService.getMyBorrowedBooks(
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sách đang mượn thành công',
      data: books,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sách đang mượn:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách sách đang mượn',
    });
  }
};

// Tra cứu độc giả
export const getReaderByCardCode = async (
  req: Request,
  res: Response,
) => {
  try {
    const cardCode = String(req.params.cardCode || '').trim();

    if (!cardCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã thẻ độc giả',
      });
    }

    const reader =
      await circulationService.getReaderByCardCode(cardCode);

    return res.status(200).json({
      success: true,
      message: 'Tìm độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '';

    return res.status(404).json({
      success: false,
      message: message || 'Không tìm thấy độc giả',
    });
  }
};

// Tra cứu bản sách bằng mã vạch
export const getCopyByBarcode = async (
  req: Request,
  res: Response,
) => {
  try {
    const barcode = String(req.params.barcode || '').trim();

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã vạch',
      });
    }

    const copy =
      await circulationService.getCopyByBarcode(barcode);

    return res.status(200).json({
      success: true,
      message: 'Tìm bản sách thành công',
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '';

    return res.status(404).json({
      success: false,
      message: message || 'Không tìm thấy bản sách',
    });
  }
};

// Lập phiếu mượn
export const createBorrowing = async (
  req: Request,
  res: Response,
) => {
  try {
    const validation = createBorrowingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const borrowing = await circulationService.createBorrowing(
      req.user.id,
      validation.data,
    );

    return res.status(201).json({
      success: true,
      message: 'Lập phiếu mượn thành công',
      data: borrowing,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '';

    const knownErrors = [
      'Không tìm thấy độc giả hợp lệ',
      'Danh sách mã vạch có bản sách bị trùng',
      'Có bản sách không tồn tại hoặc không ở trạng thái sẵn sàng',
    ];

    if (
      knownErrors.includes(message) ||
      message.startsWith('Độc giả chỉ còn được mượn') ||
      message.startsWith('Bản sách')
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error('Lỗi lập phiếu mượn:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lập phiếu mượn',
    });
  }
};

// Trả sách
export const returnBook = async (
  req: Request,
  res: Response,
) => {
  try {
    const validation = returnBookSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu trả sách không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const result = await circulationService.returnBook(
      req.user.id,
      validation.data,
    );

    return res.status(200).json({
      success: true,
      message: 'Trả sách thành công',
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '';

    if (
      message.includes('Không tìm thấy bản sách đang được mượn') ||
      message.includes('đã được xử lý trả')
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error('Lỗi trả sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi trả sách',
    });
  }
};
// Lịch sử mượn trả của tài khoản độc giả
export const getMyBorrowingHistory = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const history =
      await circulationService.getMyBorrowingHistory(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử mượn trả thành công',
      data: history,
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử mượn trả:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy lịch sử mượn trả',
    });
  }
};

// ======================================================
// DANH SÁCH TOÀN BỘ SÁCH ĐANG ĐƯỢC MƯỢN
// DÀNH CHO ADMIN / LIBRARIAN
// ======================================================

export const getAllActiveBorrowings = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const borrowings =
      await circulationService.getAllActiveBorrowings();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sách đang được mượn thành công',
      data: borrowings,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sách đang được mượn:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách sách đang được mượn',
    });
  }
};
