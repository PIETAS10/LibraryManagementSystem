
import prisma from '../../config/db';

// Chuyển tên thể loại thành slug không dấu
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Tạo slug duy nhất trong database
const createUniqueSlug = async (name: string, excludeId?: number) => {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.category.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Lấy danh sách thể loại
export const getAllCategories = async () => {
  return prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          book_categories: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

// Lấy thông tin một thể loại
export const getCategoryById = async (id: number) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          book_categories: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error('Không tìm thấy thể loại sách');
  }

  return category;
};

// Tạo thể loại mới
export const createCategory = async (data: {
  name: string;
  description?: string;
  parent_id?: number | null;
}) => {
  if (data.parent_id) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parent_id },
    });

    if (!parent) {
      throw new Error('Thể loại cha không tồn tại');
    }
  }

  const slug = await createUniqueSlug(data.name);

  return prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      parent_id: data.parent_id ?? null,
    },
  });
};

// Cập nhật thể loại
export const updateCategory = async (
  id: number,
  data: {
    name?: string;
    description?: string;
    parent_id?: number | null;
  },
) => {
  const existingCategory = await prisma.category.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    throw new Error('Không tìm thấy thể loại sách');
  }

  if (data.parent_id === id) {
    throw new Error('Thể loại không thể là cha của chính nó');
  }

  if (data.parent_id) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parent_id },
    });

    if (!parent) {
      throw new Error('Thể loại cha không tồn tại');
    }
  }

  const slug = data.name
    ? await createUniqueSlug(data.name, id)
    : existingCategory.slug;

  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name, slug } : {}),
      ...(data.description !== undefined
        ? { description: data.description || null }
        : {}),
      ...(data.parent_id !== undefined
        ? { parent_id: data.parent_id }
        : {}),
    },
  });
};

// Xóa thể loại
export const deleteCategory = async (id: number) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          children: true,
          book_categories: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error('Không tìm thấy thể loại sách');
  }

  if (category._count.children > 0) {
    throw new Error('Không thể xóa thể loại đang có thể loại con');
  }

  if (category._count.book_categories > 0) {
    throw new Error('Không thể xóa thể loại đang được sử dụng bởi sách');
  }

  return prisma.category.delete({
    where: { id },
  });
};
