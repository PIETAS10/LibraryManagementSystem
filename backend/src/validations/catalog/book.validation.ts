
import { z } from 'zod';

// Validation khi tạo đầu sách mới
export const createBookSchema = z
  .object({
    isbn: z
      .string()
      .trim()
      .max(20, 'ISBN không được vượt quá 20 ký tự')
      .optional()
      .or(z.literal('')),

    title: z
      .string()
      .trim()
      .min(1, 'Tên sách không được để trống')
      .max(255, 'Tên sách quá dài'),

    summary: z
      .string()
      .trim()
      .max(10000, 'Mô tả quá dài')
      .optional()
      .or(z.literal('')),

    publisher_id: z.number().int().positive().nullable().optional(),

    publication_year: z
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear() + 1)
      .nullable()
      .optional(),

    edition: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal('')),

    language: z.string().trim().min(2).max(20).default('vi'),

    page_count: z.number().int().positive().nullable().optional(),

    cover_image_url: z.string().url().nullable().optional(),

    author_ids: z.array(z.number().int().positive()).default([]),

    category_ids: z.array(z.number().int().positive()).default([]),

    // Thông tin các bản sao
    copy_count: z
      .number()
      .int()
      .min(1, 'Số lượng bản sao tối thiểu là 1')
      .max(500, 'Số lượng bản sao tối đa là 500')
      .default(1),

    shelf_location: z
      .string()
      .trim()
      .max(100, 'Vị trí kệ không được vượt quá 100 ký tự')
      .optional()
      .or(z.literal('')),

    price: z
      .number()
      .min(0, 'Giá sách không được nhỏ hơn 0')
      .default(0),
  })
  .strict()
  .refine(
    (data) => new Set(data.author_ids).size === data.author_ids.length,
    {
      message: 'Danh sách tác giả không được chứa phần tử trùng lặp',
      path: ['author_ids'],
    },
  )
  .refine(
    (data) => new Set(data.category_ids).size === data.category_ids.length,
    {
      message: 'Danh sách thể loại không được chứa phần tử trùng lặp',
      path: ['category_ids'],
    },
  );

// Validation khi cập nhật đầu sách
export const updateBookSchema = z
  .object({
    isbn: z
      .string()
      .trim()
      .max(20, 'ISBN không được vượt quá 20 ký tự')
      .optional()
      .or(z.literal('')),

    title: z
      .string()
      .trim()
      .min(1, 'Tên sách không được để trống')
      .max(255, 'Tên sách quá dài')
      .optional(),

    summary: z
      .string()
      .trim()
      .max(10000, 'Mô tả quá dài')
      .optional()
      .or(z.literal('')),

    publisher_id: z.number().int().positive().nullable().optional(),

    publication_year: z
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear() + 1)
      .nullable()
      .optional(),

    edition: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal('')),

    language: z.string().trim().min(2).max(20).optional(),

    page_count: z.number().int().positive().nullable().optional(),

    cover_image_url: z.string().url().nullable().optional(),

    author_ids: z.array(z.number().int().positive()).optional(),

    category_ids: z.array(z.number().int().positive()).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.author_ids === undefined ||
      new Set(data.author_ids).size === data.author_ids.length,
    {
      message: 'Danh sách tác giả không được chứa phần tử trùng lặp',
      path: ['author_ids'],
    },
  )
  .refine(
    (data) =>
      data.category_ids === undefined ||
      new Set(data.category_ids).size === data.category_ids.length,
    {
      message: 'Danh sách thể loại không được chứa phần tử trùng lặp',
      path: ['category_ids'],
    },
  );

// Validation ID đầu sách
export const bookIdSchema = z.object({
  id: z.string().uuid(),
});
