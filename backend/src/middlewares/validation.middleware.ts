
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

// Kiểm tra dữ liệu trong request body
export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    // Nếu dữ liệu không hợp lệ
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu gửi lên không hợp lệ',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Gán dữ liệu đã được kiểm tra
    req.body = result.data;

    return next();
  };
};
