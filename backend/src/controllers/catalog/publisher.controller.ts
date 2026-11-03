
import { Request, Response } from 'express';
import * as publisherService from '../../services/catalog/publisher.service';

// Lấy danh sách nhà xuất bản
export const getAllPublishers = async (
  _req: Request,
  res: Response,
) => {
  try {
    const publishers = await publisherService.getAllPublishers();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhà xuất bản thành công',
      data: publishers,
    });
  } catch (error) {
    console.error('Get publishers error:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách nhà xuất bản',
    });
  }
};

// Lấy chi tiết nhà xuất bản
export const getPublisherById = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const publisher = await publisherService.getPublisherById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin nhà xuất bản thành công',
      data: publisher,
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

// Tạo nhà xuất bản
export const createPublisher = async (
  req: Request,
  res: Response,
) => {
  try {
    const publisher = await publisherService.createPublisher(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo nhà xuất bản thành công',
      data: publisher,
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

// Cập nhật nhà xuất bản
export const updatePublisher = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const publisher = await publisherService.updatePublisher(
      id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật nhà xuất bản thành công',
      data: publisher,
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

// Xóa nhà xuất bản
export const deletePublisher = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    await publisherService.deletePublisher(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa nhà xuất bản thành công',
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
