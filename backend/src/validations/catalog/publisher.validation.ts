
import { z } from 'zod';

// Kiểm tra dữ liệu khi tạo nhà xuất bản
export const createPublisherSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhà xuất bản không được để trống')
    .max(255, 'Tên nhà xuất bản quá dài'),

  address: z
    .string()
    .trim()
    .max(500, 'Địa chỉ quá dài')
    .optional()
    .or(z.literal('')),

  contact_email: z
    .string()
    .trim()
    .email('Email không hợp lệ')
    .max(255)
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .trim()
    .max(30, 'Số điện thoại quá dài')
    .optional()
    .or(z.literal('')),
}).strict();

// Kiểm tra dữ liệu khi cập nhật nhà xuất bản
export const updatePublisherSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhà xuất bản không được để trống')
    .max(255, 'Tên nhà xuất bản quá dài')
    .optional(),

  address: z
    .string()
    .trim()
    .max(500, 'Địa chỉ quá dài')
    .optional()
    .or(z.literal('')),

  contact_email: z
    .string()
    .trim()
    .email('Email không hợp lệ')
    .max(255)
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .trim()
    .max(30, 'Số điện thoại quá dài')
    .optional()
    .or(z.literal('')),
}).strict();
