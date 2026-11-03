
import prisma from '../../config/db';

type DashboardActivity = {
  reader: string;
  book: string;
  action: string;
  date: Date;
  status: string;
};

export const getDashboardOverview = async () => {
  const now = new Date();

  const [
    totalBooks,
    availableCopies,
    borrowedCopies,
    overdueCopies,
    recentBorrowings,
    recentReturns,
  ] = await Promise.all([
    // Tổng số đầu sách chưa bị xóa
    prisma.book.count({
      where: {
        deleted_at: null,
      },
    }),

    // Số bản sách có thể cho mượn
    prisma.bookCopy.count({
      where: {
        status: 'AVAILABLE',
        book: {
          deleted_at: null,
        },
      },
    }),

    // Số bản sách đang được mượn
    prisma.borrowingDetail.count({
      where: {
        status: 'BORROWED',
      },
    }),

    // Số bản sách đang mượn và đã quá hạn
    prisma.borrowingDetail.count({
      where: {
        status: 'BORROWED',
        due_date: {
          lt: now,
        },
      },
    }),

    // Lấy các phiếu mượn gần đây
    prisma.borrowing.findMany({
      orderBy: {
        borrow_date: 'desc',
      },
      take: 10,
      include: {
        reader: {
          select: {
            full_name: true,
          },
        },
        borrowing_details: {
          include: {
            book_copy: {
              include: {
                book: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    // Lấy các bản sách đã trả gần đây
    prisma.borrowingDetail.findMany({
      where: {
        returned_date: {
          not: null,
        },
      },
      orderBy: {
        returned_date: 'desc',
      },
      take: 10,
      include: {
        borrowing: {
          include: {
            reader: {
              select: {
                full_name: true,
              },
            },
          },
        },
        book_copy: {
          include: {
            book: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Tổng hợp hoạt động mượn và trả
  const activities: DashboardActivity[] = [
    ...recentBorrowings.flatMap((borrowing) =>
      borrowing.borrowing_details.map((detail) => ({
        reader: borrowing.reader.full_name,
        book: detail.book_copy.book.title,
        action: 'Mượn sách',
        date: borrowing.borrow_date,
        status:
          detail.status === 'RETURNED'
            ? 'Đã hoàn thành'
            : 'Đang mượn',
      })),
    ),

    ...recentReturns.map((detail) => ({
      reader: detail.borrowing.reader.full_name,
      book: detail.book_copy.book.title,
      action: 'Trả sách',
      date: detail.returned_date as Date,
      status: 'Đã hoàn thành',
    })),
  ];

  // Sắp xếp hoạt động mới nhất lên trước
  activities.sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return {
    statistics: {
      total_books: totalBooks,
      available_books: availableCopies,
      borrowed_books: borrowedCopies,
      overdue_books: overdueCopies,
    },

    recent_activities: activities.slice(0, 4),

    current_date: now,
  };
};
