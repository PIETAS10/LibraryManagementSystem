
import { Request, Response } from 'express';
import * as userService from '../../services/users/user.service';

// Lấy danh sách độc giả
export const getAllReaders = async (
  req: Request,
  res: Response,
) => {
  try {
    const search = String(req.query.search || '');
    const status = String(req.query.status || '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const result = await userService.getAllReaders(
      search,
      status,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách độc giả thành công',
      data: {
        readers: result.readers,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error('Get readers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách độc giả',
    });
  }
};

// Lấy chi tiết độc giả
export const getReaderById = async (
  req: Request,
  res: Response,
) => {
  try {
    const reader = await userService.getReaderById(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';
    const statusCode = message.includes('Không tìm thấy') ? 404 : 500;

    return res.status(statusCode).json({ success: false, message });
  }
};

// Admin tạo tài khoản độc giả
export const createReader = async (
  req: Request,
  res: Response,
) => {
  try {
    const reader = await userService.createReader(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    console.error('Create reader error:', error);

    return res.status(400).json({ success: false, message });
  }
};

// Cập nhật thông tin độc giả
export const updateReader = async (
  req: Request,
  res: Response,
) => {
  try {
    const reader = await userService.updateReader(
      String(req.params.id),
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';
    const statusCode = message.includes('Không tìm thấy') ? 404 : 400;

    return res.status(statusCode).json({ success: false, message });
  }
};

// Duyệt đăng ký độc giả
export const approveReader = async (
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

    const reader = await userService.approveReader(
      String(req.params.id),
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: 'Duyệt đăng ký độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({ success: false, message });
  }
};

// Từ chối đăng ký độc giả
export const rejectReader = async (
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

    const reader = await userService.rejectReader(
      String(req.params.id),
      req.body.rejection_reason,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: 'Từ chối đăng ký độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({ success: false, message });
  }
};

// Khóa tài khoản độc giả
export const lockReader = async (
  req: Request,
  res: Response,
) => {
  try {
    const reader = await userService.lockReader(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Khóa tài khoản độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({ success: false, message });
  }
};

// Mở khóa tài khoản độc giả
export const unlockReader = async (
  req: Request,
  res: Response,
) => {
  try {
    const reader = await userService.unlockReader(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Mở khóa tài khoản độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định';

    return res.status(400).json({ success: false, message });
  }
};

// ==========================================
// QUẢN LÝ NHÂN VIÊN
// ==========================================

// Lấy danh sách nhân viên
export const getAllEmployees = async (
  req: Request,
  res: Response,
) => {
  try {
    const search = String(req.query.search || '');
    const status = String(req.query.status || '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const result = await userService.getAllEmployees(
      search,
      status,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhân viên thành công',
      data: result,
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách nhân viên',
    });
  }
};

// Tạo tài khoản nhân viên
export const createEmployee = async (
  req: Request,
  res: Response,
) => {
  try {
    const employee = await userService.createEmployee(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản nhân viên thành công',
      data: employee,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể tạo nhân viên';

    return res.status(400).json({ success: false, message });
  }
};

// Cập nhật thông tin nhân viên
export const updateEmployee = async (
  req: Request,
  res: Response,
) => {
  try {
    const employeeId = String(req.params.id);
    const employee = await userService.updateEmployee(
      employeeId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật nhân viên thành công',
      data: employee,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể cập nhật nhân viên';

    return res.status(400).json({ success: false, message });
  }
};

// Khóa tài khoản nhân viên
export const lockEmployee = async (
  req: Request,
  res: Response,
) => {
  try {
    const employeeId = String(req.params.id);
    const employee = await userService.lockEmployee(employeeId);

    return res.status(200).json({
      success: true,
      message: 'Khóa tài khoản nhân viên thành công',
      data: employee,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể khóa nhân viên';

    return res.status(400).json({ success: false, message });
  }
};

// Mở khóa tài khoản nhân viên
export const unlockEmployee = async (
  req: Request,
  res: Response,
) => {
  try {
    const employeeId = String(req.params.id);
    const employee = await userService.unlockEmployee(employeeId);

    return res.status(200).json({
      success: true,
      message: 'Mở khóa tài khoản nhân viên thành công',
      data: employee,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể mở khóa nhân viên';

    return res.status(400).json({ success: false, message });
  }
};
// Xóa tài khoản độc giả
export const deleteReader = async (req: Request, res: Response) => {
  try {
    const reader = await userService.deleteReader(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản độc giả thành công',
      data: reader,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể xóa độc giả';

    const statusCode = message.includes('Không tìm thấy') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};