
import { z } from 'zod';

// Kiểm tra dữ liệu khi tạo tác giả
export const createAuthorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên tác giả không được để trống')
    .max(255, 'Tên tác giả quá dài'),

  bio: z
    .string()
    .trim()
    .max(10000, 'Tiểu sử không được vượt quá 10000 ký tự')
    .optional()
    .or(z.literal('')),

  birth_date: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
}).strict();

// Kiểm tra dữ liệu khi cập nhật tác giả
export const updateAuthorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên tác giả không được để trống')
    .max(255, 'Tên tác giả quá dài')
    .optional(),

  bio: z
    .string()
    .trim()
    .max(10000, 'Tiểu sử không được vượt quá 10000 ký tự')
    .optional()
    .or(z.literal('')),

  birth_date: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
}).strict();

export const authorIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
