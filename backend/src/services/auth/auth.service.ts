
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import {
  createHash,
  randomBytes,
  randomUUID,
} from 'crypto';

import prisma from '../../config/db';

// Lỗi xác thực có mã trạng thái HTTP
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

// Tạo SHA-256 hash cho Refresh Token
const hashRefreshToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

// Tạo Access Token
const generateAccessToken = (
  userId: string,
  sessionId: string,
  tokenVersion: number,
): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET chưa được cấu hình');
  }

  const expiresIn = (
    process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  ) as SignOptions['expiresIn'];

  return jwt.sign(
    {
      sid: sessionId,
      ver: tokenVersion,
    },
    secret,
    {
      subject: userId,
      expiresIn,
    },
  );
};

// Đăng nhập
export const login = async (
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  // Tìm tài khoản theo email
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
    include: {
      user_roles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Không tiết lộ tài khoản có tồn tại hay không
  if (!user) {
    throw new AuthError('Email hoặc mật khẩu không chính xác', 401);
  }

  // Kiểm tra mật khẩu
  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new AuthError('Email hoặc mật khẩu không chính xác', 401);
  }

  // Chỉ tài khoản ACTIVE mới được đăng nhập
  if (user.status !== 'ACTIVE' || user.deleted_at !== null) {
    throw new AuthError(
      'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa',
      403,
    );
  }

  // Tạo Refresh Token ngẫu nhiên
  const refreshToken = randomBytes(64).toString('hex');

  // Tạo ID phiên đăng nhập và nhóm token
  const sessionId = randomUUID();
  const familyId = randomUUID();

  // Chuyển Refresh Token thành SHA-256 hash
  const tokenHash = hashRefreshToken(refreshToken);

  // Thời hạn Refresh Token theo cấu hình cookie (milliseconds)
  const refreshTokenMaxAge =
    Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) ||
    7 * 24 * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + refreshTokenMaxAge);

  // Tạo phiên đăng nhập trong database
  await prisma.refreshToken.create({
    data: {
      id: sessionId,
      user_id: user.id,
      token_hash: tokenHash,
      family_id: familyId,
      expires_at: expiresAt,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    },
  });

  // Tạo Access Token
  const accessToken = generateAccessToken(
    user.id,
    sessionId,
    user.token_version,
  );

  // Lấy danh sách vai trò
  const roles = user.user_roles.map(
    (userRole) => userRole.role.code,
  );

  // Trả thông tin an toàn về Controller
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles,
    },
  };
};
// Làm mới Access Token và xoay vòng Refresh Token
export const refreshSession = async (
  oldRefreshToken: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  // Băm Refresh Token nhận được để tìm trong database
  const oldTokenHash = hashRefreshToken(oldRefreshToken);

  const currentSession = await prisma.refreshToken.findUnique({
    where: {
      token_hash: oldTokenHash,
    },
    include: {
      user: {
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  // Không tìm thấy token
  if (!currentSession) {
    throw new AuthError('Refresh Token không hợp lệ', 401);
  }

  // Phát hiện token cũ đã bị sử dụng lại
  if (currentSession.is_revoked) {
    await prisma.refreshToken.updateMany({
      where: {
        family_id: currentSession.family_id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    throw new AuthError(
      'Phát hiện Refresh Token đã bị sử dụng lại. Vui lòng đăng nhập lại',
      401,
    );
  }

  // Kiểm tra thời hạn Refresh Token
  if (currentSession.expires_at <= new Date()) {
    await prisma.refreshToken.update({
      where: {
        id: currentSession.id,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    throw new AuthError('Refresh Token đã hết hạn', 401);
  }

  const user = currentSession.user;

  // Kiểm tra trạng thái tài khoản
  if (user.status !== 'ACTIVE' || user.deleted_at !== null) {
    await prisma.refreshToken.updateMany({
      where: {
        family_id: currentSession.family_id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    throw new AuthError(
      'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa',
      403,
    );
  }

  // Tạo Refresh Token mới
  const newRefreshToken = randomBytes(64).toString('hex');
  const newTokenHash = hashRefreshToken(newRefreshToken);

  // Tạo ID phiên đăng nhập mới
  const newSessionId = randomUUID();

  // Thời hạn Refresh Token mới
  const refreshTokenMaxAge =
    Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) ||
    7 * 24 * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + refreshTokenMaxAge);

  // Tạo Access Token mới gắn với phiên mới
  const newAccessToken = generateAccessToken(
    user.id,
    newSessionId,
    user.token_version,
  );

  // Xoay vòng token trong một transaction
  const rotationSucceeded = await prisma.$transaction(async (tx) => {
    // Chỉ một yêu cầu được phép thu hồi token cũ
    const revoked = await tx.refreshToken.updateMany({
      where: {
        id: currentSession.id,
        token_hash: oldTokenHash,
        is_revoked: false,
        expires_at: {
          gt: new Date(),
        },
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
        last_used_at: new Date(),
      },
    });

    // Nếu token đã bị yêu cầu khác sử dụng trước đó
    if (revoked.count !== 1) {
      return false;
    }

    // Lưu Refresh Token mới vào database
    await tx.refreshToken.create({
      data: {
        id: newSessionId,
        user_id: user.id,
        token_hash: newTokenHash,
        family_id: currentSession.family_id,
        expires_at: expiresAt,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      },
    });

    return true;
  });

  // Nếu token cũ đã được sử dụng ở một yêu cầu khác,
  // thu hồi toàn bộ phiên thuộc cùng family
  if (!rotationSucceeded) {
    await prisma.refreshToken.updateMany({
      where: {
        family_id: currentSession.family_id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        revoked_at: new Date(),
      },
    });

    throw new AuthError(
      'Refresh Token không còn hiệu lực. Vui lòng đăng nhập lại',
      401,
    );
  }

  const roles = user.user_roles.map(
    (userRole) => userRole.role.code,
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles,
    },
  };
};
// Đăng xuất khỏi phiên hiện tại
export const logout = async (sessionId: string) => {
  await prisma.refreshToken.updateMany({
    where: {
      id: sessionId,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: new Date(),
    },
  });
};
// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      status: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new AuthError('Không tìm thấy tài khoản', 404);
  }

  return user;
};

// Đăng ký tài khoản độc giả
export const registerReader = async (data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
}) => {
  const email = data.email.trim().toLowerCase();

  // Kiểm tra email đã tồn tại
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AuthError('Email này đã được sử dụng', 409);
  }

  // Tìm vai trò READER
  const readerRole = await prisma.role.findUnique({
    where: { code: 'READER' },
  });

  if (!readerRole) {
    throw new AuthError('Không tìm thấy vai trò độc giả', 500);
  }

  // Mã hóa mật khẩu
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      // Tạo tài khoản chờ duyệt
      const newUser = await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          full_name: data.full_name.trim(),
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          status: 'PENDING_APPROVAL',
        },
      });

      // Gán vai trò READER
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role_id: readerRole.id,
        },
      });

      const staff = await tx.user.findMany({
        where: {
          deleted_at: null,
          status: 'ACTIVE',
          user_roles: {
            some: {
              role: {
                code: { in: ['ADMIN', 'LIBRARIAN'] },
              },
            },
          },
        },
        select: { id: true },
      });

      if (staff.length > 0) {
        await tx.notification.createMany({
          data: staff.map(({ id }) => ({
            user_id: id,
            title: 'Có yêu cầu đăng ký mới',
            message: `${newUser.full_name} vừa đăng ký tài khoản độc giả và đang chờ duyệt.`,
            type: 'SYSTEM',
            link_url: '/readers',
          })),
        });
      }

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AuthError('Email này đã được sử dụng', 409);
    }

    throw error;
  }
};