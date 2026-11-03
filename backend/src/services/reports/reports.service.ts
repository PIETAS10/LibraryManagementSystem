
import prisma from '../../config/db';

interface ReportFilters {
  from?: string;
  to?: string;
}

export const getReportsOverview = async (filters: ReportFilters) => {
  const now = new Date();

  // Mặc định lấy tháng hiện tại
  const from = filters.from
    ? new Date(`${filters.from}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const to = filters.to
    ? new Date(`${filters.to}T23:59:59.999Z`)
    : now;

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from > to
  ) {
    throw new Error('Khoảng thời gian báo cáo không hợp lệ');
  }

  const period = {
    gte: from,
    lte: to,
  };

  const [
    totalBooks,
    totalCopies,
    availableCopies,
    borrowedCopies,
    reservedCopies,
    maintenanceCopies,
    lostCopies,
    totalReaders,
    newReaders,
    borrowingCount,
    returnedCount,
    currentBorrowingCount,
    overdueCount,
    fineStatistics,
    topBorrowedCopies,
  ] = await Promise.all([
    // Tổng đầu sách
    prisma.book.count({
      where: { deleted_at: null },
    }),

    // Tổng bản sách
    prisma.bookCopy.count({
      where: { book: { deleted_at: null } },
    }),

    prisma.bookCopy.count({
      where: {
        status: 'AVAILABLE',
        book: { deleted_at: null },
      },
    }),

    prisma.bookCopy.count({
      where: {
        status: 'BORROWED',
        book: { deleted_at: null },
      },
    }),

    prisma.bookCopy.count({
      where: {
        status: 'RESERVED',
        book: { deleted_at: null },
      },
    }),

    prisma.bookCopy.count({
      where: {
        status: 'MAINTENANCE',
        book: { deleted_at: null },
      },
    }),

    prisma.bookCopy.count({
      where: {
        status: 'LOST',
        book: { deleted_at: null },
      },
    }),

    // Tổng độc giả đang hoạt động
    prisma.user.count({
      where: {
        deleted_at: null,
        status: 'ACTIVE',
        user_roles: {
          some: {
            role: { code: 'READER' },
          },
        },
      },
    }),

    // Độc giả đăng ký trong kỳ
    prisma.user.count({
      where: {
        deleted_at: null,
        created_at: period,
        user_roles: {
          some: {
            role: { code: 'READER' },
          },
        },
      },
    }),

    // Số phiếu mượn được tạo trong kỳ
    prisma.borrowing.count({
      where: {
        borrow_date: period,
      },
    }),

    // Số lượt trả sách trong kỳ
    prisma.borrowingDetail.count({
      where: {
        returned_date: period,
      },
    }),

    // Số bản sách hiện đang được mượn
    prisma.borrowingDetail.count({
      where: {
        status: 'BORROWED',
      },
    }),

    // Số bản sách hiện đang quá hạn
    prisma.borrowingDetail.count({
      where: {
        status: 'BORROWED',
        due_date: { lt: now },
      },
    }),

    // Thống kê tiền phạt phát sinh trong kỳ
    prisma.fine.groupBy({
      by: ['status'],
      where: {
        created_at: period,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    }),

    // Lấy các bản sách có nhiều lượt mượn nhất
    prisma.borrowingDetail.groupBy({
      by: ['book_copy_id'],
      where: {
        borrowing: {
          borrow_date: period,
        },
      },
      _count: {
        book_copy_id: true,
      },
      orderBy: {
        _count: {
          book_copy_id: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  // Quy đổi tiền phạt sang number để frontend sử dụng
  const fineSummary = {
    total: 0,
    paid: 0,
    unpaid: 0,
    waived: 0,
    total_count: 0,
  };

  for (const item of fineStatistics) {
    const amount = Number(item._sum.amount ?? 0);

    fineSummary.total += amount;
    fineSummary.total_count += item._count.id;

    if (item.status === 'PAID') {
      fineSummary.paid += amount;
    } else if (item.status === 'UNPAID') {
      fineSummary.unpaid += amount;
    } else if (item.status === 'WAIVED') {
      fineSummary.waived += amount;
    }
  }

  // Lấy tên sách tương ứng với các bản sách được mượn nhiều
  const copyIds = topBorrowedCopies.map((item) => item.book_copy_id);

  const copies = copyIds.length
    ? await prisma.bookCopy.findMany({
        where: {
          id: { in: copyIds },
        },
        select: {
          id: true,
          book: {
            select: {
              title: true,
            },
          },
        },
      })
    : [];

  const copyMap = new Map(
    copies.map((copy) => [copy.id, copy.book.title]),
  );

  const topBooks = topBorrowedCopies.map((item) => ({
    title: copyMap.get(item.book_copy_id) ?? 'Không xác định',
    borrow_count: item._count.book_copy_id,
  }));

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },

    books: {
      total_titles: totalBooks,
      total_copies: totalCopies,
      available: availableCopies,
      borrowed: borrowedCopies,
      reserved: reservedCopies,
      maintenance: maintenanceCopies,
      lost: lostCopies,
    },

    circulation: {
      borrowing_slips: borrowingCount,
      returned_books: returnedCount,
      currently_borrowed: currentBorrowingCount,
      overdue: overdueCount,
    },

    readers: {
      total_active: totalReaders,
      new_readers: newReaders,
    },

    fines: fineSummary,

    top_books: topBooks,
  };
};
