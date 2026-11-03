import { Request, Response, NextFunction } from 'express';

// Middleware xử lý lỗi tập trung
export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error('Server Error:', error);

  return res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi từ máy chủ',
  });
};