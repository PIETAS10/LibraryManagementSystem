
import { Request, Response } from 'express';
import * as fineService from '../../services/fines/fine.service';

// ADMIN và LIBRARIAN: xem toàn bộ tiền phạt
export const getAllFines = async (req: Request, res: Response) => {
  try {
    const fines = await fineService.getAllFines();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tiền phạt thành công',
      data: fines,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tiền phạt:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách tiền phạt',
    });
  }
};

// READER: chỉ xem tiền phạt của bản thân
export const getMyFines = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const fines = await fineService.getMyFines(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tiền phạt của bạn thành công',
      data: fines,
    });
  } catch (error) {
    console.error('Lỗi lấy tiền phạt của độc giả:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy tiền phạt',
    });
  }
};

// ADMIN và LIBRARIAN: thu tiền phạt
export const payFine = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const id = req.params.id;

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID khoản phạt không hợp lệ',
      });
    }

    const { payment_method } = req.body;
    const allowedMethods = ['CASH', 'TRANSFER', 'CARD'];
    const method = payment_method || 'CASH';

    if (
      typeof method !== 'string' ||
      !allowedMethods.includes(method)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ',
      });
    }

    const fine = await fineService.payFine(
      id,
      req.user.id,
      method,
    );

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khoản phạt hoặc khoản phạt đã được xử lý',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Thu tiền phạt thành công',
      data: fine,
    });
  } catch (error) {
    console.error('Lỗi thu tiền phạt:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thu tiền phạt',
    });
  }
};

// ADMIN và LIBRARIAN: miễn tiền phạt
export const waiveFine = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const id = req.params.id;

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID khoản phạt không hợp lệ',
      });
    }

    const { waiver_reason } = req.body;

    if (
      typeof waiver_reason !== 'string' ||
      !waiver_reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do miễn phạt',
      });
    }

    const fine = await fineService.waiveFine(
      id,
      waiver_reason.trim(),
    );

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khoản phạt hoặc khoản phạt đã được xử lý',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Miễn tiền phạt thành công',
      data: fine,
    });
  } catch (error) {
    console.error('Lỗi miễn tiền phạt:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi miễn tiền phạt',
    });
  }
};
