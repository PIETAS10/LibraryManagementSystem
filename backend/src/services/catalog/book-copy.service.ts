import prisma from '../../config/db';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

// Sinh mã vạch tự động
const generateBarcode = () => {
  return `LIB-${randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()}`;
};

// Lấy danh sách bản sách
export const getAllBookCopies = async (params: {
  search?: string;
  status?: string;
  condition?: string;
  page?: number;
  limit?: number;
}) => {
  const {
    search,
    status,
    condition,
    page = 1,
    limit = 10,
  } = params;

  const where: Prisma.BookCopyWhereInput = {
    book: {
      deleted_at: null,
    },

    ...(search
      ? {
          OR: [
            {
              barcode: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              book: {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {}),

    ...(status ? { status: status as any } : {}),
    ...(condition ? { condition: condition as any } : {}),
  };

  const skip = (page - 1) * limit;

  const [copies, total] = await prisma.$transaction([
    prisma.bookCopy.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),

    prisma.bookCopy.count({ where }),
  ]);

  return {
    copies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Lấy chi tiết một bản sách
export const getBookCopyById = async (id: string) => {
  const copy = await prisma.bookCopy.findFirst({
    where: {
      id,
      book: {
        deleted_at: null,
      },
    },
    include: {
      book: true,
    },
  });

  if (!copy) {
    throw new Error('Không tìm thấy bản sách');
  }

  return copy;
};

// Thêm bản sách
export const createBookCopy = async (data: {
  book_id: string;
  shelf_location?: string;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  price: number;
}) => {
  // Kiểm tra đầu sách
  const book = await prisma.book.findFirst({
    where: {
      id: data.book_id,
      deleted_at: null,
    },
  });

  if (!book) {
    throw new Error('Đầu sách không tồn tại');
  }

  return prisma.bookCopy.create({
    data: {
      book_id: data.book_id,
      barcode: generateBarcode(),
      status: 'AVAILABLE',
      condition: data.condition,
      shelf_location: data.shelf_location || null,
      price: data.price,
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
        },
      },
    },
  });
};

// Cập nhật thông tin bản sách
export const updateBookCopy = async (
  id: string,
  data: {
    shelf_location?: string | null;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
    price?: number;
  },
) => {
  return prisma.$transaction(async (tx) => {
    const existingCopy = await tx.bookCopy.findUnique({
      where: { id },
    });

    if (!existingCopy) {
      throw new Error('Không tìm thấy bản sách');
    }

    // Không thay đổi tình trạng vật lý khi sách đang được mượn
    if (
      existingCopy.status === 'BORROWED' &&
      data.condition !== undefined
    ) {
      throw new Error(
        'Không thể cập nhật tình trạng sách khi sách đang được mượn',
      );
    }

    return tx.bookCopy.update({
      where: { id },
      data: {
        ...(data.shelf_location !== undefined && {
          shelf_location: data.shelf_location || null,
        }),
        ...(data.condition !== undefined && {
          condition: data.condition,
        }),
        ...(data.price !== undefined && {
          price: data.price,
        }),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
          },
        },
      },
    });
  });
};

// Xóa bản sách
export const deleteBookCopy = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const existingCopy = await tx.bookCopy.findUnique({
      where: { id },
    });

    if (!existingCopy) {
      throw new Error('Không tìm thấy bản sách');
    }

    if (
      existingCopy.status === 'BORROWED' ||
      existingCopy.status === 'RESERVED'
    ) {
      throw new Error(
        'Không thể xóa bản sách đang được mượn hoặc đặt trước',
      );
    }

    // Giữ lại bản sách nếu đã có lịch sử mượn
    const borrowingHistory = await tx.borrowingDetail.findFirst({
      where: {
        book_copy_id: id,
      },
    });

    if (borrowingHistory) {
      throw new Error(
        'Không thể xóa bản sách đã có lịch sử mượn trả',
      );
    }

    // Không xóa bản sách đang được gán cho yêu cầu đặt trước
    const activeReservation = await tx.reservation.findFirst({
      where: {
        book_copy_id: id,
        status: {
          in: ['WAITING', 'READY'],
        },
      },
    });

    if (activeReservation) {
      throw new Error(
        'Không thể xóa bản sách đang được gán cho yêu cầu đặt trước',
      );
    }

    return tx.bookCopy.delete({
      where: { id },
    });
  });
};