
import { Request, Response } from 'express';
import * as authorService from '../../services/catalog/author.service';

// Lấy danh sách tác giả
export const getAllAuthors = async (
  _req: Request,
  res: Response,
) => {
  try {
    const authors = await authorService.getAllAuthors();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tác giả thành công',
      data: authors,
    });
  } catch (error) {
    console.error('Get authors error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách tác giả',
    });
  }
};

// Lấy chi tiết tác giả
export const getAuthorById = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const author = await authorService.getAuthorById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin tác giả thành công',
      data: author,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(404).json({
      success: false,
      message,
    });
  }
};

// Tạo tác giả
export const createAuthor = async (
  req: Request,
  res: Response,
) => {
  try {
    const author = await authorService.createAuthor(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo tác giả thành công',
      data: author,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

// Cập nhật tác giả
export const updateAuthor = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const author = await authorService.updateAuthor(id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tác giả thành công',
      data: author,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

// Xóa tác giả
export const deleteAuthor = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    await authorService.deleteAuthor(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa tác giả thành công',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({
      success: false,
      message,
    });
  }
};
