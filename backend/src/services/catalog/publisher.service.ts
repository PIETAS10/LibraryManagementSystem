
import prisma from '../../config/db';

// Lấy danh sách nhà xuất bản
export const getAllPublishers = async () => {
  return prisma.publisher.findMany({
    include: {
      _count: {
        select: {
          books: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

// Lấy chi tiết nhà xuất bản
export const getPublisherById = async (id: number) => {
  const publisher = await prisma.publisher.findUnique({
    where: { id },
    include: {
      books: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          isbn: true,
          title: true,
          publication_year: true,
        },
        orderBy: {
          title: 'asc',
        },
      },
      _count: {
        select: {
          books: true,
        },
      },
    },
  });

  if (!publisher) {
    throw new Error('Không tìm thấy nhà xuất bản');
  }

  return publisher;
};

// Tạo nhà xuất bản
export const createPublisher = async (data: {
  name: string;
  address?: string;
  contact_email?: string;
  phone?: string;
}) => {
  return prisma.publisher.create({
    data: {
      name: data.name,
      address: data.address || null,
      contact_email: data.contact_email || null,
      phone: data.phone || null,
    },
  });
};

// Cập nhật nhà xuất bản
export const updatePublisher = async (
  id: number,
  data: {
    name?: string;
    address?: string;
    contact_email?: string;
    phone?: string;
  },
) => {
  const publisher = await prisma.publisher.findUnique({
    where: { id },
  });

  if (!publisher) {
    throw new Error('Không tìm thấy nhà xuất bản');
  }

  return prisma.publisher.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.address !== undefined
        ? { address: data.address || null }
        : {}),
      ...(data.contact_email !== undefined
        ? { contact_email: data.contact_email || null }
        : {}),
      ...(data.phone !== undefined
        ? { phone: data.phone || null }
        : {}),
    },
  });
};

// Xóa nhà xuất bản
export const deletePublisher = async (id: number) => {
  const publisher = await prisma.publisher.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          books: true,
        },
      },
    },
  });

  if (!publisher) {
    throw new Error('Không tìm thấy nhà xuất bản');
  }

  if (publisher._count.books > 0) {
    throw new Error(
      'Không thể xóa nhà xuất bản đang được liên kết với sách',
    );
  }

  return prisma.publisher.delete({
    where: { id },
  });
};
