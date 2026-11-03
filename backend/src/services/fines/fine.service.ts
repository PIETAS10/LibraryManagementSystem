import { randomBytes } from 'crypto';
import prisma from '../../config/db';

// Phần thông tin liên quan được trả về cùng khoản tiền phạt
const fineInclude = {
  reader: {
    select: {
      id: true,
      card_code: true,
      full_name: true,
      email: true,
      phone: true,
    },
  },
  collector: {
    select: {
      id: true,
      full_name: true,
    },
  },
  borrowing_detail: {
    include: {
      book_copy: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
            },
          },
        },
      },
    },
  },
};

// Lấy toàn bộ khoản tiền phạt dành cho ADMIN và LIBRARIAN
export const getAllFines = async () => {
  return prisma.fine.findMany({
    include: fineInclude,
    orderBy: {
      created_at: 'desc',
    },
  });
};

// Lấy các khoản tiền phạt của chính độc giả đang đăng nhập
export const getMyFines = async (readerId: string) => {
  return prisma.fine.findMany({
    where: {
      reader_id: readerId,
    },
    include: {
      borrowing_detail: {
        include: {
          book_copy: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  isbn: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

// Thu tiền phạt
export const payFine = async (
  fineId: string,
  collectorId: string,
  paymentMethod: string = 'CASH',
) => {
  return prisma.$transaction(async (tx) => {
    // Chỉ cập nhật khoản phạt chưa thanh toán
    const result = await tx.fine.updateMany({
      where: {
        id: fineId,
        status: 'UNPAID',
      },
      data: {
        status: 'PAID',
        payment_method: paymentMethod,
        collected_by_id: collectorId,
        paid_at: new Date(),
        receipt_number: `REC-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`,
      },
    });

    // Không có khoản phạt nào được cập nhật
    if (result.count === 0) {
      return null;
    }

    return tx.fine.findUnique({
      where: {
        id: fineId,
      },
      include: fineInclude,
    });
  });
};

// Miễn toàn bộ tiền phạt
export const waiveFine = async (
  fineId: string,
  waiverReason: string,
) => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.fine.updateMany({
      where: {
        id: fineId,
        status: 'UNPAID',
      },
      data: {
        status: 'WAIVED',
        waiver_reason: waiverReason,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return tx.fine.findUnique({
      where: {
        id: fineId,
      },
      include: fineInclude,
    });
  });
};