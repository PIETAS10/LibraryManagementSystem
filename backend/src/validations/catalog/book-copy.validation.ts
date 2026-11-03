import { z } from 'zod';
import { CopyCondition } from '@prisma/client';

// Validation khi thêm bản sách
export const createBookCopySchema = z
  .object({
    book_id: z.string().uuid('ID đầu sách không hợp lệ'),

    shelf_location: z
      .string()
      .trim()
      .max(100, 'Vị trí kệ không được vượt quá 100 ký tự')
      .optional()
      .or(z.literal('')),

    condition: z.nativeEnum(CopyCondition).default('NEW'),

    price: z
      .number()
      .min(0, 'Giá sách không được nhỏ hơn 0')
      .default(0),
  })
  .strict();

// Validation khi cập nhật bản sách
export const updateBookCopySchema = z
  .object({
    shelf_location: z
      .string()
      .trim()
      .max(100, 'Vị trí kệ không được vượt quá 100 ký tự')
      .nullable()
      .optional(),

    condition: z.nativeEnum(CopyCondition).optional(),

    price: z
      .number()
      .min(0, 'Giá sách không được nhỏ hơn 0')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng nhập thông tin cần cập nhật',
  });