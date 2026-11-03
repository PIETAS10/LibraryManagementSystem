import prisma from '../../config/db';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

// Lấy danh sách sách có tìm kiếm, lọc và phân trang
export const getAllBooks = async (params: {
  search?: string;
  categoryId?: number;
  authorId?: number;
  page?: number;
  limit?: number;
}) => {
  const {
    search,
    categoryId,
    authorId,
    page = 1,
    limit = 10,
  } = params;

  const where: Prisma.BookWhereInput = {
    deleted_at: null,

    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { isbn: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),

    ...(categoryId
      ? {
          book_categories: {
            some: { category_id: categoryId },
          },
        }
      : {}),

    ...(authorId
      ? {
          book_authors: {
            some: { author_id: authorId },
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [books, total] = await prisma.$transaction([
    prisma.book.findMany({
      where,
      include: {
        publisher: {
          select: { id: true, name: true },
        },
        book_authors: {
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
        },
        book_categories: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            book_copies: true,
          },
        },
        book_copies: {
          where: {
            status: 'AVAILABLE',
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),

    prisma.book.count({ where }),
  ]);

  return {
    books: books.map((book) => {
      const { _count, book_copies, ...bookData } = book;

      return {
        ...bookData,
        total_copies: _count.book_copies,
        available_copies: book_copies.length,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Lấy chi tiết một đầu sách
export const getBookById = async (id: string) => {
  const book = await prisma.book.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      publisher: true,
      book_authors: {
        include: { author: true },
      },
      book_categories: {
        include: { category: true },
      },
      book_copies: true,
    },
  });

  if (!book) {
    throw new Error('Không tìm thấy sách');
  }

  const availableCopies = book.book_copies.filter(
    (copy) => copy.status === 'AVAILABLE',
  ).length;

  return {
    ...book,
    total_copies: book.book_copies.length,
    available_copies: availableCopies,
  };
};

// Thêm đầu sách mới cùng tác giả, thể loại và các bản sao
export const createBook = async (data: {
  isbn?: string;
  title: string;
  summary?: string;
  publisher_id?: number | null;
  publication_year?: number | null;
  edition?: string;
  language: string;
  page_count?: number | null;
  cover_image_url?: string | null;
  author_ids: number[];
  category_ids: number[];
  copy_count: number;
  shelf_location?: string;
  price: number;
}) => {
  return prisma.$transaction(async (tx) => {
    if (data.publisher_id) {
      const publisher = await tx.publisher.findUnique({
        where: { id: data.publisher_id },
      });

      if (!publisher) {
        throw new Error('Nhà xuất bản không tồn tại');
      }
    }

    if (data.author_ids.length > 0) {
      const authors = await tx.author.findMany({
        where: { id: { in: data.author_ids } },
        select: { id: true },
      });

      if (authors.length !== data.author_ids.length) {
        throw new Error('Một hoặc nhiều tác giả không tồn tại');
      }
    }

    if (data.category_ids.length > 0) {
      const categories = await tx.category.findMany({
        where: { id: { in: data.category_ids } },
        select: { id: true },
      });

      if (categories.length !== data.category_ids.length) {
        throw new Error('Một hoặc nhiều thể loại không tồn tại');
      }
    }

    const book = await tx.book.create({
      data: {
        isbn: data.isbn || null,
        title: data.title,
        summary: data.summary || null,
        publisher_id: data.publisher_id ?? null,
        publication_year: data.publication_year ?? null,
        edition: data.edition || null,
        language: data.language,
        page_count: data.page_count ?? null,
        cover_image_url: data.cover_image_url ?? null,

        book_authors: {
          create: data.author_ids.map((authorId) => ({
            author_id: authorId,
          })),
        },

        book_categories: {
          create: data.category_ids.map((categoryId) => ({
            category_id: categoryId,
          })),
        },
      },
    });

    await tx.bookCopy.createMany({
      data: Array.from({ length: data.copy_count }, () => ({
        book_id: book.id,
        barcode: `LIB-${randomUUID()
          .replace(/-/g, '')
          .slice(0, 12)
          .toUpperCase()}`,
        status: 'AVAILABLE',
        condition: 'NEW',
        shelf_location: data.shelf_location || null,
        price: data.price,
      })),
    });

    return tx.book.findUnique({
      where: { id: book.id },
      include: {
        publisher: true,
        book_authors: {
          include: { author: true },
        },
        book_categories: {
          include: { category: true },
        },
        book_copies: true,
      },
    });
  });
};

// Cập nhật thông tin đầu sách
export const updateBook = async (
  id: string,
  data: {
    isbn?: string;
    title?: string;
    summary?: string;
    publisher_id?: number | null;
    publication_year?: number | null;
    edition?: string;
    language?: string;
    page_count?: number | null;
    cover_image_url?: string | null;
    author_ids?: number[];
    category_ids?: number[];
  },
) => {
  return prisma.$transaction(async (tx) => {
    const existingBook = await tx.book.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingBook) {
      throw new Error('Không tìm thấy sách');
    }

    if (data.publisher_id) {
      const publisher = await tx.publisher.findUnique({
        where: { id: data.publisher_id },
      });

      if (!publisher) {
        throw new Error('Nhà xuất bản không tồn tại');
      }
    }

    if (data.author_ids !== undefined && data.author_ids.length > 0) {
      const authors = await tx.author.findMany({
        where: { id: { in: data.author_ids } },
        select: { id: true },
      });

      if (authors.length !== data.author_ids.length) {
        throw new Error('Một hoặc nhiều tác giả không tồn tại');
      }
    }

    if (data.category_ids !== undefined && data.category_ids.length > 0) {
      const categories = await tx.category.findMany({
        where: { id: { in: data.category_ids } },
        select: { id: true },
      });

      if (categories.length !== data.category_ids.length) {
        throw new Error('Một hoặc nhiều thể loại không tồn tại');
      }
    }

    const updateData: Prisma.BookUpdateInput = {
      ...(data.isbn !== undefined && {
        isbn: data.isbn || null,
      }),
      ...(data.title !== undefined && {
        title: data.title,
      }),
      ...(data.summary !== undefined && {
        summary: data.summary || null,
      }),
      ...(data.publisher_id !== undefined && {
        publisher: data.publisher_id
          ? { connect: { id: data.publisher_id } }
          : { disconnect: true },
      }),
      ...(data.publication_year !== undefined && {
        publication_year: data.publication_year,
      }),
      ...(data.edition !== undefined && {
        edition: data.edition || null,
      }),
      ...(data.language !== undefined && {
        language: data.language,
      }),
      ...(data.page_count !== undefined && {
        page_count: data.page_count,
      }),
      ...(data.cover_image_url !== undefined && {
        cover_image_url: data.cover_image_url,
      }),
    };

    if (data.author_ids !== undefined) {
      updateData.book_authors = {
        deleteMany: {},
        create: data.author_ids.map((authorId) => ({
          author: { connect: { id: authorId } },
        })),
      };
    }

    if (data.category_ids !== undefined) {
      updateData.book_categories = {
        deleteMany: {},
        create: data.category_ids.map((categoryId) => ({
          category: { connect: { id: categoryId } },
        })),
      };
    }

    return tx.book.update({
      where: { id },
      data: updateData,
      include: {
        publisher: true,
        book_authors: {
          include: { author: true },
        },
        book_categories: {
          include: { category: true },
        },
      },
    });
  });
};

// Xóa mềm đầu sách
export const deleteBook = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const existingBook = await tx.book.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!existingBook) {
      throw new Error('Không tìm thấy sách');
    }

    const borrowedCopy = await tx.bookCopy.findFirst({
      where: {
        book_id: id,
        status: 'BORROWED',
      },
    });

    if (borrowedCopy) {
      throw new Error(
        'Không thể xóa sách vì vẫn còn bản sách đang được mượn',
      );
    }

    const activeBorrowing = await tx.borrowingDetail.findFirst({
      where: {
        book_copy: {
          book_id: id,
        },
        status: 'BORROWED',
      },
    });

    if (activeBorrowing) {
      throw new Error(
        'Không thể xóa sách vì vẫn còn giao dịch mượn chưa hoàn tất',
      );
    }

    const activeReservation = await tx.reservation.findFirst({
      where: {
        book_id: id,
        status: {
          in: ['WAITING', 'READY'],
        },
      },
    });

    if (activeReservation) {
      throw new Error(
        'Không thể xóa sách vì vẫn còn yêu cầu đặt trước đang hoạt động',
      );
    }

    return tx.book.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  });
};