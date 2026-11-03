
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

// Kiểm tra các tham số trên URL
export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    // Nếu tham số URL không hợp lệ
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Tham số URL không hợp lệ',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return next();
  };
};
