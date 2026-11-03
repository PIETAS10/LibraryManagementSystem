
import { z } from 'zod';

// Validation khi Admin tạo tài khoản độc giả
export const createReaderSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Email không hợp lệ')
      .max(255)
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự'),

    full_name: z
      .string()
      .trim()
      .min(2, 'Họ tên phải có ít nhất 2 ký tự')
      .max(150, 'Họ tên không được vượt quá 150 ký tự'),

    phone: z
      .string()
      .trim()
      .max(20, 'Số điện thoại không hợp lệ')
      .optional()
      .or(z.literal('')),

    address: z
      .string()
      .trim()
      .max(500, 'Địa chỉ không được vượt quá 500 ký tự')
      .optional()
      .or(z.literal('')),
  })
  .strict();

// Validation khi cập nhật thông tin độc giả
export const updateReaderSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2)
      .max(150)
      .optional(),

    phone: z
      .string()
      .trim()
      .max(20)
      .nullable()
      .optional(),

    address: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng nhập thông tin cần cập nhật',
  });

// Validation khi từ chối đăng ký độc giả
export const rejectReaderSchema = z
  .object({
    rejection_reason: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập lý do từ chối')
      .max(500, 'Lý do từ chối không được vượt quá 500 ký tự'),
  })
  .strict();
// Validation khi Admin tạo tài khoản nhân viên
export const createEmployeeSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Email không hợp lệ')
      .max(255)
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự'),

    full_name: z
      .string()
      .trim()
      .min(2, 'Họ tên phải có ít nhất 2 ký tự')
      .max(150),

    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal('')),

    address: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal('')),
  })
  .strict();

// Validation khi Admin cập nhật thông tin nhân viên
export const updateEmployeeSchema = z
  .object({
    full_name: z.string().trim().min(2).max(150).optional(),

    phone: z.string().trim().max(20).nullable().optional(),

    address: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng nhập thông tin cần cập nhật',
  });