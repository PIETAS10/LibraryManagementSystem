
import { z } from 'zod';

// Validation lập phiếu mượn
export const createBorrowingSchema = z.object({
  card_code: z.string().trim().min(1, 'Vui lòng nhập mã thẻ độc giả'),

  barcodes: z
    .array(z.string().trim().min(1))
    .min(1, 'Phiếu mượn phải có ít nhất một bản sách')
    .max(5, 'Mỗi độc giả chỉ được mượn tối đa 5 bản sách'),

  notes: z.string().trim().max(2000).optional(),
});

// Validation trả sách
export const returnBookSchema = z.object({
  barcode: z.string().trim().min(1, 'Vui lòng nhập mã vạch bản sách'),

  condition_after: z.enum([
    'NEW',
    'GOOD',
    'FAIR',
    'POOR',
    'DAMAGED',
  ]),
});

export type CreateBorrowingInput = z.infer<
  typeof createBorrowingSchema
>;

export type ReturnBookInput = z.infer<
  typeof returnBookSchema
>;
