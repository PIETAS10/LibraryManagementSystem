import prisma from '../../config/db';
import { Prisma } from '@prisma/client';

const LOAN_DAYS = 14;
const MAX_BORROWED_COPIES = 5;

// ======================================================
// DANH SÁCH SÁCH ĐANG MƯỢN CỦA ĐỘC GIẢ
// ======================================================

export const getMyBorrowedBooks = async (readerId: string) => {
  const borrowedBooks = await prisma.borrowingDetail.findMany({
    where: {
      status: 'BORROWED',
      borrowing: {
        reader_id: readerId,
      },
    },
    include: {
      borrowing: {
        select: {
          id: true,
          borrow_date: true,
          status: true,
        },
      },
      book_copy: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              cover_image_url: true,
            },
          },
        },
      },
    },
    orderBy: {
      due_date: 'asc',
    },
  });

  return borrowedBooks.map((detail) => ({
    id: detail.id,
    barcode: detail.book_copy.barcode,
    book: detail.book_copy.book,
    borrow_date: detail.borrowing.borrow_date,
    due_date: detail.due_date,
    condition_before: detail.condition_before,
    status: detail.status,
    borrowing_id: detail.borrowing.id,
  }));
};

// ======================================================
// TRA CỨU ĐỘC GIẢ BẰNG MÃ THẺ
// ======================================================

export const getReaderByCardCode = async (cardCode: string) => {
  const reader = await prisma.user.findFirst({
    where: {
      card_code: cardCode,
      status: 'ACTIVE',
      deleted_at: null,
      user_roles: {
        some: {
          role: {
            code: 'READER',
          },
        },
      },
    },
    select: {
      id: true,
      card_code: true,
      full_name: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  if (!reader) {
    throw new Error('Không tìm thấy độc giả hợp lệ');
  }

  const borrowedCount = await prisma.borrowingDetail.count({
    where: {
      status: 'BORROWED',
      borrowing: {
        reader_id: reader.id,
      },
    },
  });

  return {
    ...reader,
    borrowed_count: borrowedCount,
    remaining_slots: Math.max(
      0,
      MAX_BORROWED_COPIES - borrowedCount,
    ),
  };
};

// ======================================================
// TRA CỨU BẢN SÁCH BẰNG MÃ VẠCH
// ======================================================

export const getCopyByBarcode = async (barcode: string) => {
  const copy = await prisma.bookCopy.findFirst({
    where: {
      barcode,
      book: {
        deleted_at: null,
      },
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
          cover_image_url: true,
        },
      },
    },
  });

  if (!copy) {
    throw new Error('Không tìm thấy bản sách');
  }

  return copy;
};

// ======================================================
// LẬP PHIẾU MƯỢN
// ======================================================

export const createBorrowing = async (
  librarianId: string,
  data: {
    card_code: string;
    barcodes: string[];
    notes?: string;
  },
) => {
  const uniqueBarcodes = [...new Set(data.barcodes)];

  if (uniqueBarcodes.length !== data.barcodes.length) {
    throw new Error('Danh sách mã vạch có bản sách bị trùng');
  }

  return prisma.$transaction(
    async (tx) => {
      const reader = await tx.user.findFirst({
        where: {
          card_code: data.card_code,
          status: 'ACTIVE',
          deleted_at: null,
          user_roles: {
            some: {
              role: {
                code: 'READER',
              },
            },
          },
        },
      });

      if (!reader) {
        throw new Error('Không tìm thấy độc giả hợp lệ');
      }

      const borrowedCount = await tx.borrowingDetail.count({
        where: {
          status: 'BORROWED',
          borrowing: {
            reader_id: reader.id,
          },
        },
      });

      if (borrowedCount + uniqueBarcodes.length > MAX_BORROWED_COPIES) {
        throw new Error(
          `Độc giả chỉ còn được mượn ${
            MAX_BORROWED_COPIES - borrowedCount
          } bản sách`,
        );
      }

      const copies = await tx.bookCopy.findMany({
        where: {
          barcode: {
            in: uniqueBarcodes,
          },
          status: 'AVAILABLE',
          book: {
            deleted_at: null,
          },
        },
      });

      if (copies.length !== uniqueBarcodes.length) {
        throw new Error(
          'Có bản sách không tồn tại hoặc không ở trạng thái sẵn sàng',
        );
      }

      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

      const borrowing = await tx.borrowing.create({
        data: {
          reader_id: reader.id,
          librarian_id: librarianId,
          borrow_date: now,
          status: 'BORROWING',
          notes: data.notes || null,
        },
      });

      for (const copy of copies) {
        const updated = await tx.bookCopy.updateMany({
          where: {
            id: copy.id,
            status: 'AVAILABLE',
          },
          data: {
            status: 'BORROWED',
          },
        });

        if (updated.count !== 1) {
          throw new Error(
            `Bản sách ${copy.barcode} vừa được người khác mượn`,
          );
        }

        await tx.borrowingDetail.create({
          data: {
            borrowing_id: borrowing.id,
            book_copy_id: copy.id,
            due_date: dueDate,
            condition_before: copy.condition,
            status: 'BORROWED',
          },
        });
      }

      return tx.borrowing.findUniqueOrThrow({
        where: {
          id: borrowing.id,
        },
        include: {
          reader: {
            select: {
              id: true,
              card_code: true,
              full_name: true,
              phone: true,
            },
          },
          librarian: {
            select: {
              id: true,
              full_name: true,
            },
          },
          borrowing_details: {
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
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
};

// ======================================================
// TRẢ SÁCH
// ======================================================

const OVERDUE_FINE_PER_DAY = 2000;

const calculateOverdueDays = (dueDate: Date, returnedDate: Date) => {
  const due = Date.UTC(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );

  const returned = Date.UTC(
    returnedDate.getFullYear(),
    returnedDate.getMonth(),
    returnedDate.getDate(),
  );

  return Math.max(0, Math.floor((returned - due) / 86400000));
};

export const returnBook = async (
  librarianId: string,
  data: {
    barcode: string;
    condition_after: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  },
) => {
  return prisma.$transaction(
    async (tx) => {
      const detail = await tx.borrowingDetail.findFirst({
        where: {
          status: 'BORROWED',
          book_copy: {
            barcode: data.barcode,
          },
        },
        include: {
          borrowing: {
            include: {
              reader: {
                select: {
                  id: true,
                  card_code: true,
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
                  isbn: true,
                },
              },
            },
          },
        },
      });

      if (!detail) {
        throw new Error(
          'Không tìm thấy bản sách đang được mượn với mã vạch này',
        );
      }

      const returnedDate = new Date();

      const overdueDays = calculateOverdueDays(
        detail.due_date,
        returnedDate,
      );

      const overdueFine = overdueDays * OVERDUE_FINE_PER_DAY;

      const copyStatus =
        data.condition_after === 'DAMAGED'
          ? 'MAINTENANCE'
          : 'AVAILABLE';

      const updatedDetail = await tx.borrowingDetail.updateMany({
        where: {
          id: detail.id,
          status: 'BORROWED',
        },
        data: {
          returned_date: returnedDate,
          condition_after: data.condition_after,
          status:
            data.condition_after === 'DAMAGED'
              ? 'DAMAGED'
              : 'RETURNED',
        },
      });

      if (updatedDetail.count !== 1) {
        throw new Error('Bản sách đã được xử lý trả trước đó');
      }

      await tx.bookCopy.update({
        where: {
          id: detail.book_copy_id,
        },
        data: {
          status: copyStatus,
          condition: data.condition_after,
        },
      });

      let fine = null;

      if (overdueFine > 0) {
        fine = await tx.fine.create({
          data: {
            reader_id: detail.borrowing.reader_id,
            borrowing_detail_id: detail.id,
            amount: overdueFine,
            reason: 'OVERDUE',
            status: 'UNPAID',
            payment_method: 'CASH',
            notes: `Quá hạn ${overdueDays} ngày, mức phạt ${OVERDUE_FINE_PER_DAY.toLocaleString('vi-VN')} VNĐ/ngày`,
          },
        });

        await tx.notification.create({
          data: {
            user_id: detail.borrowing.reader_id,
            title: 'Phát sinh tiền phạt quá hạn',
            message: `Bạn bị phạt ${overdueFine.toLocaleString('vi-VN')} VNĐ do trả "${detail.book_copy.book.title}" quá hạn ${overdueDays} ngày.`,
            type: 'FINE_INCURRED',
            link_url: '/fines',
          },
        });
      }

      const remainingBorrowed = await tx.borrowingDetail.count({
        where: {
          borrowing_id: detail.borrowing_id,
          status: 'BORROWED',
        },
      });

      const overdueRemaining = await tx.borrowingDetail.count({
        where: {
          borrowing_id: detail.borrowing_id,
          status: 'BORROWED',
          due_date: {
            lt: returnedDate,
          },
        },
      });

      let borrowingStatus:
        | 'BORROWING'
        | 'COMPLETED'
        | 'OVERDUE';

      if (remainingBorrowed === 0) {
        borrowingStatus = 'COMPLETED';
      } else if (overdueRemaining > 0) {
        borrowingStatus = 'OVERDUE';
      } else {
        borrowingStatus = 'BORROWING';
      }

      await tx.borrowing.update({
        where: {
          id: detail.borrowing_id,
        },
        data: {
          status: borrowingStatus,
        },
      });

      return {
        message: 'Trả sách thành công',
        reader: detail.borrowing.reader,
        book: detail.book_copy.book,
        barcode: detail.book_copy.barcode,
        returned_date: returnedDate,
        condition_after: data.condition_after,
        copy_status: copyStatus,
        overdue_days: overdueDays,
        overdue_fine: overdueFine,
        fine,
        borrowing_status: borrowingStatus,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
};
// ======================================================
// LỊCH SỬ MƯỢN TRẢ CỦA ĐỘC GIẢ
// ======================================================

export const getMyBorrowingHistory = async (readerId: string) => {
  const borrowings = await prisma.borrowing.findMany({
    where: {
      reader_id: readerId,
    },
    include: {
      borrowing_details: {
        include: {
          book_copy: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  isbn: true,
                  cover_image_url: true,
                },
              },
            },
          },
        },
        orderBy: {
          due_date: 'desc',
        },
      },
    },
    orderBy: {
      borrow_date: 'desc',
    },
  });

  return borrowings.flatMap((borrowing) =>
    borrowing.borrowing_details.map((detail) => ({
      id: detail.id,
      borrowing_id: borrowing.id,

      book: detail.book_copy.book,
      barcode: detail.book_copy.barcode,

      borrow_date: borrowing.borrow_date,
      due_date: detail.due_date,
      returned_date: detail.returned_date,

      status: detail.status,
      condition_before: detail.condition_before,
      condition_after: detail.condition_after,

      borrowing_status: borrowing.status,
    })),
  );
};

// ======================================================
// DANH SÁCH TOÀN BỘ SÁCH ĐANG ĐƯỢC ĐỘC GIẢ MƯỢN
// DÀNH CHO ADMIN / LIBRARIAN
// ======================================================

export const getAllActiveBorrowings = async () => {
  const details = await prisma.borrowingDetail.findMany({
    where: {
      status: 'BORROWED',
    },
    include: {
      borrowing: {
        select: {
          id: true,
          borrow_date: true,
          status: true,
          reader: {
            select: {
              id: true,
              card_code: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      book_copy: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              cover_image_url: true,
            },
          },
        },
      },
    },
    orderBy: {
      due_date: 'asc',
    },
  });

  return details.map((detail) => ({
    id: detail.id,
    borrowing_id: detail.borrowing.id,

    reader: detail.borrowing.reader,

    book: detail.book_copy.book,
    barcode: detail.book_copy.barcode,

    borrow_date: detail.borrowing.borrow_date,
    due_date: detail.due_date,

    condition_before: detail.condition_before,
    status: detail.status,
    borrowing_status: detail.borrowing.status,
  }));
};
