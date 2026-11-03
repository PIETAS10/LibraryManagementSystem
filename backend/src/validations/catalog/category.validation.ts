
import { z } from 'zod';

// Kiểm tra dữ liệu khi tạo thể loại
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên thể loại phải có ít nhất 2 ký tự')
    .max(100, 'Tên thể loại không được vượt quá 100 ký tự'),

  description: z
    .string()
    .trim()
    .max(500, 'Mô tả không được vượt quá 500 ký tự')
    .optional()
    .or(z.literal('')),

  parent_id: z.number().int().positive().nullable().optional(),
});

// Kiểm tra dữ liệu khi cập nhật
export const updateCategorySchema = createCategorySchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Phải cung cấp ít nhất một trường để cập nhật',
  );

// Kiểm tra ID thể loại
export const categoryIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
