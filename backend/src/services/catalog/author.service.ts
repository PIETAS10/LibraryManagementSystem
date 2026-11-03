
import prisma from '../../config/db';

// Lấy danh sách tác giả
export const getAllAuthors = async () => {
  return prisma.author.findMany({
    include: {
      _count: {
        select: {
          book_authors: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

// Lấy chi tiết tác giả
export const getAuthorById = async (id: number) => {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      book_authors: {
        include: {
          book: {
            select: {
              id: true,
              isbn: true,
              title: true,
            },
          },
        },
      },
      _count: {
        select: {
          book_authors: true,
        },
      },
    },
  });

  if (!author) {
    throw new Error('Không tìm thấy tác giả');
  }

  return author;
};

// Tạo tác giả mới
export const createAuthor = async (data: {
  name: string;
  bio?: string;
  birth_date?: string | null;
}) => {
  return prisma.author.create({
    data: {
      name: data.name,
      bio: data.bio || null,
      birth_date: data.birth_date
        ? new Date(data.birth_date)
        : null,
    },
  });
};

// Cập nhật tác giả
export const updateAuthor = async (
  id: number,
  data: {
    name?: string;
    bio?: string;
    birth_date?: string | null;
  },
) => {
  const author = await prisma.author.findUnique({
    where: { id },
  });

  if (!author) {
    throw new Error('Không tìm thấy tác giả');
  }

  return prisma.author.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.bio !== undefined
        ? { bio: data.bio || null }
        : {}),
      ...(data.birth_date !== undefined
        ? {
            birth_date: data.birth_date
              ? new Date(data.birth_date)
              : null,
          }
        : {}),
    },
  });
};

// Xóa tác giả
export const deleteAuthor = async (id: number) => {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          book_authors: true,
        },
      },
    },
  });

  if (!author) {
    throw new Error('Không tìm thấy tác giả');
  }

  if (author._count.book_authors > 0) {
    throw new Error(
      'Không thể xóa tác giả đang được liên kết với sách',
    );
  }

  return prisma.author.delete({
    where: { id },
  });
};
