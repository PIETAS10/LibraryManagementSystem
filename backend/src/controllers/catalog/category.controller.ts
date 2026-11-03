
import { Request, Response } from 'express';
import * as categoryService from '../../services/catalog/category.service';

// Lấy danh sách thể loại
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await categoryService.getAllCategories();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thể loại thành công',
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách thể loại',
    });
  }
};

// Lấy chi tiết thể loại
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const category = await categoryService.getCategoryById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin thể loại thành công',
      data: category,
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

// Tạo thể loại mới
export const createCategory = async (req: Request, res: Response) => {
  try {
    const category = await categoryService.createCategory(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo thể loại thành công',
      data: category,
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

// Cập nhật thể loại
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const category = await categoryService.updateCategory(id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thể loại thành công',
      data: category,
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

// Xóa thể loại
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await categoryService.deleteCategory(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa thể loại thành công',
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
