import { z } from 'zod';
import { updateBookSchema } from '../../validations/catalog/book.validation';
import { Request, Response } from 'express';
import * as bookService from '../../services/catalog/book.service';
import { createBookSchema } from '../../validations/catalog/book.validation';
// Lấy danh sách sách
export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || '').trim();

    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;

    const authorId = req.query.authorId
      ? Number(req.query.authorId)
      : undefined;

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (
      (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId <= 0)) ||
      (authorId !== undefined && (!Number.isInteger(authorId) || authorId <= 0)) ||
      !Number.isInteger(page) || page < 1 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tham số tìm kiếm hoặc phân trang không hợp lệ',
      });
    }

    const result = await bookService.getAllBooks({
      search,
      categoryId,
      authorId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sách thành công',
      data: result.books,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sách:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sách',
    });
  }
};

// Lấy thông tin chi tiết một cuốn sách
export const getBookById = async (req: Request, res: Response) => {
  try {
    const book = await bookService.getBookById(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin sách thành công',
      data: book,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sách',
    });
  }
};
// Thêm đầu sách mới
export const createBook = async (req: Request, res: Response) => {
  try {
    // Kiểm tra dữ liệu đầu vào
    const validation = createBookSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Gọi Service để tạo sách
    const book = await bookService.createBook(validation.data);

    return res.status(201).json({
      success: true,
      message: 'Thêm sách thành công',
      data: book,
    });
  } catch (error) {
    console.error('Lỗi thêm sách:', error);

    const message = error instanceof Error
      ? error.message
      : 'Không thể thêm sách';

    if (
      message.includes('không tồn tại') ||
      message.includes('Unique constraint')
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thêm sách',
    });
  }
};
// Cập nhật thông tin sách
export const updateBook = async (req: Request, res: Response) => {
  try {
    const bookId = String(req.params.id);

    // Kiểm tra định dạng UUID
    const uuidSchema = z.string().uuid();

    if (!uuidSchema.safeParse(bookId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID sách không hợp lệ',
      });
    }

    // Kiểm tra dữ liệu cập nhật
    const validation = updateBookSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Gọi Service cập nhật sách
    const book = await bookService.updateBook(
      bookId,
      validation.data,
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sách thành công',
      data: book,
    });
  } catch (error) {
    console.error('Lỗi cập nhật sách:', error);

    const message = error instanceof Error
      ? error.message
      : 'Không thể cập nhật sách';

    if (message === 'Không tìm thấy sách') {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (
      message.includes('không tồn tại') ||
      message.includes('Unique constraint')
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật sách',
    });
  }
};
// Xóa mềm đầu sách
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

if (!z.string().uuid().safeParse(id).success) {
  return res.status(400).json({
    success: false,
    message: 'ID sách không hợp lệ',
  });
}

    const deletedBook = await bookService.deleteBook(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa sách thành công',
      data: deletedBook,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể xóa sách';

    if (message === 'Không tìm thấy sách') {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message.startsWith('Không thể xóa sách')) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error('Delete book error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa sách',
    });
  }
};