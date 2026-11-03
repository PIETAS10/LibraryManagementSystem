import { Request, Response } from 'express';
import { z } from 'zod';
import { CopyStatus, CopyCondition } from '@prisma/client';

import * as bookCopyService from '../../services/catalog/book-copy.service';

import {
  createBookCopySchema,
  updateBookCopySchema,
} from '../../validations/catalog/book-copy.validation';

// Lấy danh sách bản sách
export const getAllBookCopies = async (
  req: Request,
  res: Response,
) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = req.query.status
      ? String(req.query.status)
      : undefined;
    const condition = req.query.condition
      ? String(req.query.condition)
      : undefined;

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tham số phân trang không hợp lệ',
      });
    }

    if (
      status &&
      !Object.values(CopyStatus).includes(status as CopyStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái bản sách không hợp lệ',
      });
    }

    if (
      condition &&
      !Object.values(CopyCondition).includes(
        condition as CopyCondition,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tình trạng bản sách không hợp lệ',
      });
    }

    const result = await bookCopyService.getAllBookCopies({
      search,
      status,
      condition,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách bản sách thành công',
      data: result.copies,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách bản sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách bản sách',
    });
  }
};

// Lấy chi tiết bản sách
export const getBookCopyById = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = String(req.params.id);

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        message: 'ID bản sách không hợp lệ',
      });
    }

    const copy = await bookCopyService.getBookCopyById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin bản sách thành công',
      data: copy,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản sách',
    });
  }
};

// Thêm bản sách
export const createBookCopy = async (
  req: Request,
  res: Response,
) => {
  try {
    const validation = createBookCopySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const copy = await bookCopyService.createBookCopy(
      validation.data,
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm bản sách thành công',
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể thêm bản sách';

    if (message === 'Đầu sách không tồn tại') {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    console.error('Lỗi thêm bản sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thêm bản sách',
    });
  }
};

// Cập nhật bản sách
export const updateBookCopy = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = String(req.params.id);

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        message: 'ID bản sách không hợp lệ',
      });
    }

    const validation = updateBookCopySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const copy = await bookCopyService.updateBookCopy(
      id,
      validation.data,
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bản sách thành công',
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể cập nhật bản sách';

    if (message === 'Không tìm thấy bản sách') {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message.startsWith('Không thể')) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error('Lỗi cập nhật bản sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật bản sách',
    });
  }
};

// Xóa bản sách
export const deleteBookCopy = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = String(req.params.id);

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        message: 'ID bản sách không hợp lệ',
      });
    }

    const deletedCopy = await bookCopyService.deleteBookCopy(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa bản sách thành công',
      data: deletedCopy,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể xóa bản sách';

    if (message === 'Không tìm thấy bản sách') {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message.startsWith('Không thể xóa bản sách')) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error('Lỗi xóa bản sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa bản sách',
    });
  }
};