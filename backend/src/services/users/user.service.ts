
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../../config/db';

// Các trường an toàn được phép trả về frontend
const readerSelect = {
  id: true,
  email: true,
  full_name: true,
  phone: true,
  card_code: true,
  address: true,
  status: true,
  approved_at: true,
  rejection_reason: true,
  created_at: true,
  updated_at: true,
};

// Tạo mã thẻ độc giả, chỉ gọi bên trong transaction
const generateReaderCardCode = async (
  tx: Prisma.TransactionClient,
): Promise<string> => {
  const year = new Date().getFullYear();

  const counter = await tx.cardCounter.upsert({
    where: { year },
    create: {
      year,
      last_seq: 1,
    },
    update: {
      last_seq: {
        increment: 1,
      },
    },
  });

  return `LIB-RD-${year}-${String(counter.last_seq).padStart(4, '0')}`;
};

// Điều kiện chung để xác định tài khoản độc giả
const readerWhere = {
  deleted_at: null,
  user_roles: {
    some: {
      role: {
        code: 'READER',
      },
    },
  },
};

// Lấy danh sách độc giả
export const getAllReaders = async (
  search = '',
  status = '',
  page = 1,
  limit = 10,
) => {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const skip = (safePage - 1) * safeLimit;

  const where: Prisma.UserWhereInput = {
    ...readerWhere,
  };

  const keyword = search.trim();

  if (keyword) {
    where.OR = [
      { full_name: { contains: keyword, mode: 'insensitive' } },
      { email: { contains: keyword, mode: 'insensitive' } },
      { phone: { contains: keyword, mode: 'insensitive' } },
      { card_code: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  const validStatuses = [
    'PENDING_APPROVAL',
    'ACTIVE',
    'REJECTED',
    'LOCKED',
  ];

  if (validStatuses.includes(status)) {
    where.status = status as Prisma.EnumUserStatusFilter['equals'];
  }

  const [readers, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: readerSelect,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    readers,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// Lấy chi tiết độc giả
export const getReaderById = async (id: string) => {
  const reader = await prisma.user.findFirst({
    where: {
      id,
      ...readerWhere,
    },
    select: {
      ...readerSelect,
      user_roles: {
        select: {
          role: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          borrowings_as_reader: true,
          reservations: true,
          fines_as_reader: true,
        },
      },
    },
  });

  if (!reader) {
    throw new Error('Không tìm thấy độc giả');
  }

  return reader;
};

// Admin tạo tài khoản độc giả và cấp mã thẻ ngay
export const createReader = async (data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
}) => {
  const email = data.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email đã được sử dụng');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    return await prisma.$transaction(async (tx) => {
      const cardCode = await generateReaderCardCode(tx);

      return tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          full_name: data.full_name.trim(),
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          card_code: cardCode,
          status: 'ACTIVE',
          approved_at: new Date(),
          user_roles: {
            create: {
              role: {
                connect: {
                  code: 'READER',
                },
              },
            },
          },
        },
        select: readerSelect,
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('Email hoặc mã thẻ đã được sử dụng');
    }

    throw error;
  }
};

// Cập nhật thông tin độc giả
export const updateReader = async (
  id: string,
  data: {
    full_name?: string;
    phone?: string | null;
    address?: string | null;
  },
) => {
  const reader = await prisma.user.findFirst({
    where: {
      id,
      ...readerWhere,
    },
    select: {
      id: true,
    },
  });

  if (!reader) {
    throw new Error('Không tìm thấy độc giả');
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.full_name !== undefined
        ? { full_name: data.full_name.trim() }
        : {}),
      ...(data.phone !== undefined
        ? { phone: data.phone?.trim() || null }
        : {}),
      ...(data.address !== undefined
        ? { address: data.address?.trim() || null }
        : {}),
    },
    select: readerSelect,
  });
};

// Duyệt đăng ký độc giả
export const approveReader = async (
  id: string,
  approvedById: string,
) => {
  return prisma.$transaction(async (tx) => {
    const reader = await tx.user.findFirst({
      where: {
        id,
        ...readerWhere,
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
      },
    });

    if (!reader) {
      throw new Error(
        'Không tìm thấy yêu cầu đăng ký đang chờ duyệt',
      );
    }

    const cardCode = await generateReaderCardCode(tx);

    const approvedReader = await tx.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        card_code: cardCode,
        approved_by_id: approvedById,
        approved_at: new Date(),
        rejection_reason: null,
      },
      select: readerSelect,
    });

    await tx.notification.create({
      data: {
        user_id: id,
        title: 'Tài khoản đã được duyệt',
        message: `Tài khoản của bạn đã được duyệt. Mã thẻ độc giả: ${cardCode}.`,
        type: 'ACCOUNT_APPROVED',
        link_url: '/my-borrowed-books',
      },
    });

    return approvedReader;
  });
};

// Từ chối đăng ký độc giả
export const rejectReader = async (
  id: string,
  rejectionReason: string,
  approvedById: string,
) => {
  const reason = rejectionReason.trim();

  if (!reason) {
    throw new Error('Vui lòng nhập lý do từ chối');
  }

  return prisma.$transaction(async (tx) => {
    const reader = await tx.user.findFirst({
      where: {
        id,
        ...readerWhere,
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
      },
    });

    if (!reader) {
      throw new Error(
        'Không tìm thấy yêu cầu đăng ký đang chờ duyệt',
      );
    }

    const rejectedReader = await tx.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejection_reason: reason,
        approved_by_id: approvedById,
        approved_at: new Date(),
      },
      select: readerSelect,
    });

    await tx.notification.create({
      data: {
        user_id: id,
        title: 'Yêu cầu đăng ký chưa được duyệt',
        message: `Yêu cầu đăng ký của bạn chưa được duyệt. Lý do: ${reason}`,
        type: 'SYSTEM',
      },
    });

    return rejectedReader;
  });
};

// Khóa tài khoản độc giả và thu hồi toàn bộ refresh token
export const lockReader = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const reader = await tx.user.findFirst({
      where: {
        id,
        ...readerWhere,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!reader) {
      throw new Error('Không tìm thấy độc giả đang hoạt động');
    }

    const updatedReader = await tx.user.update({
      where: { id },
      data: {
        status: 'LOCKED',
        token_version: {
          increment: 1,
        },
      },
      select: readerSelect,
    });

    await tx.refreshToken.updateMany({
      where: {
        user_id: id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    return updatedReader;
  });
};

// Mở khóa tài khoản độc giả
export const unlockReader = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const reader = await tx.user.findFirst({
      where: {
        id,
        ...readerWhere,
        status: 'LOCKED',
      },
      select: {
        id: true,
      },
    });

    if (!reader) {
      throw new Error('Không tìm thấy độc giả đang bị khóa');
    }

    return tx.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        token_version: {
          increment: 1,
        },
      },
      select: readerSelect,
    });
  });
};
// Điều kiện xác định tài khoản nhân viên LIBRARIAN
const employeeWhere = {
  deleted_at: null,
  user_roles: {
    some: {
      role: {
        code: 'LIBRARIAN',
      },
    },
  },
};

// Các trường an toàn trả về frontend
const employeeSelect = {
  id: true,
  email: true,
  full_name: true,
  phone: true,
  address: true,
  status: true,
  created_at: true,
  updated_at: true,
};

// Lấy danh sách nhân viên
export const getAllEmployees = async (
  search = '',
  status = '',
  page = 1,
  limit = 10,
) => {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const skip = (safePage - 1) * safeLimit;

  const where: Prisma.UserWhereInput = {
    ...employeeWhere,
  };

  const keyword = search.trim();

  if (keyword) {
    where.OR = [
      { full_name: { contains: keyword, mode: 'insensitive' } },
      { email: { contains: keyword, mode: 'insensitive' } },
      { phone: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  const validStatuses = ['ACTIVE', 'LOCKED'];

  if (validStatuses.includes(status)) {
    where.status = status as Prisma.EnumUserStatusFilter['equals'];
  }

  const [employees, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: employeeSelect,
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    employees,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// Admin tạo tài khoản nhân viên LIBRARIAN
export const createEmployee = async (data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
}) => {
  const email = data.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email đã được sử dụng');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    return await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        full_name: data.full_name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        status: 'ACTIVE',
        user_roles: {
          create: {
            role: {
              connect: {
                code: 'LIBRARIAN',
              },
            },
          },
        },
      },
      select: employeeSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('Email đã được sử dụng');
    }

    throw error;
  }
};

// Cập nhật thông tin nhân viên
export const updateEmployee = async (
  id: string,
  data: {
    full_name?: string;
    phone?: string | null;
    address?: string | null;
  },
) => {
  const employee = await prisma.user.findFirst({
    where: {
      id,
      ...employeeWhere,
    },
    select: { id: true },
  });

  if (!employee) {
    throw new Error('Không tìm thấy nhân viên');
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.full_name !== undefined
        ? { full_name: data.full_name.trim() }
        : {}),
      ...(data.phone !== undefined
        ? { phone: data.phone?.trim() || null }
        : {}),
      ...(data.address !== undefined
        ? { address: data.address?.trim() || null }
        : {}),
    },
    select: employeeSelect,
  });
};

// Khóa tài khoản nhân viên và thu hồi refresh token
export const lockEmployee = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: {
        id,
        ...employeeWhere,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!employee) {
      throw new Error('Không tìm thấy nhân viên đang hoạt động');
    }

    const updatedEmployee = await tx.user.update({
      where: { id },
      data: {
        status: 'LOCKED',
        token_version: { increment: 1 },
      },
      select: employeeSelect,
    });

    await tx.refreshToken.updateMany({
      where: {
        user_id: id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    return updatedEmployee;
  });
};

// Mở khóa tài khoản nhân viên
export const unlockEmployee = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: {
        id,
        ...employeeWhere,
        status: 'LOCKED',
      },
      select: { id: true },
    });

    if (!employee) {
      throw new Error('Không tìm thấy nhân viên đang bị khóa');
    }

    return tx.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        token_version: { increment: 1 },
      },
      select: employeeSelect,
    });
  });
};
// Xóa mềm tài khoản độc giả
export const deleteReader = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    // Kiểm tra tài khoản có tồn tại và đúng vai trò READER
    const reader = await tx.user.findFirst({
      where: {
        id,
        ...readerWhere,
      },
      select: {
        id: true,
        full_name: true,
      },
    });

    if (!reader) {
      throw new Error('Không tìm thấy độc giả');
    }

    // Kiểm tra độc giả còn sách chưa trả hay không
    const activeBorrowing = await tx.borrowingDetail.findFirst({
      where: {
        borrowing: {
          reader_id: id,
        },
        status: 'BORROWED',
      },
      select: {
        id: true,
      },
    });

    if (activeBorrowing) {
      throw new Error(
        'Không thể xóa độc giả vì vẫn còn sách chưa trả',
      );
    }

    // Kiểm tra khoản phạt chưa thanh toán
    const unpaidFine = await tx.fine.findFirst({
      where: {
        reader_id: id,
        status: 'UNPAID',
      },
      select: {
        id: true,
      },
    });

    if (unpaidFine) {
      throw new Error(
        'Không thể xóa độc giả vì vẫn còn khoản phạt chưa thanh toán',
      );
    }

    // Đánh dấu xóa mềm và vô hiệu hóa phiên đăng nhập
    const deletedReader = await tx.user.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        token_version: {
          increment: 1,
        },
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        deleted_at: true,
      },
    });

    // Thu hồi toàn bộ refresh token
    await tx.refreshToken.updateMany({
      where: {
        user_id: id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    return deletedReader;
  });
};