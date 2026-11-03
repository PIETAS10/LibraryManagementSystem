import { z } from 'zod';

// Kiểm tra dữ liệu đăng nhập
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email không đúng định dạng')
    .max(255, 'Email quá dài')
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(128, 'Mật khẩu quá dài'),
});

// Kiểm tra dữ liệu đăng ký độc giả
export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên quá dài'),

  email: z
    .string()
    .trim()
    .email('Email không đúng định dạng')
    .max(255, 'Email quá dài')
    .transform((value) => value.toLowerCase()),

  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại quá dài')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .trim()
    .max(255, 'Địa chỉ quá dài')
    .optional()
    .or(z.literal('')),

  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(128, 'Mật khẩu quá dài'),

  confirm_password: z
    .string()
    .min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  },
);