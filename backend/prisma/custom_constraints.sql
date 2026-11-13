-- ==============================================================
-- CÁC RÀNG BUỘC NGHIỆP VỤ BỔ SUNG TRÊN POSTGRESQL
-- Script setup local áp dụng file này sau khi chạy Prisma migrations.
-- ==============================================================

-- 1. Chống một độc giả đặt nhiều lượt WAITING hoặc READY cho cùng một đầu sách
-- (Bảo toàn lịch sử các lượt đặt COMPLETED, CANCELLED, EXPIRED trong quá khứ)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_reader_reservation 
ON "reservations" ("reader_id", "book_id") 
WHERE "status" IN ('WAITING'::"ReservationStatus", 'READY'::"ReservationStatus");

-- 2. Chống một book_copy được gán cho nhiều Reservation đang ở trạng thái READY cùng lúc
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ready_book_copy_reservation 
ON "reservations" ("book_copy_id") 
WHERE "status" = 'READY'::"ReservationStatus" AND "book_copy_id" IS NOT NULL;

-- 3. Bảo đảm một bản sách vật lý không thể có nhiều lượt BorrowingDetail đang BORROWED cùng lúc
-- (Bảo toàn lịch sử các lần mượn/trả RETURNED, LOST, DAMAGED trong quá khứ)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_borrowed_copy 
ON "borrowing_details" ("book_copy_id") 
WHERE "status" = 'BORROWED'::"BorrowingDetailStatus";

-- 4. Giới hạn renewal_count chỉ được phép trong khoảng từ 0 đến 1 (mỗi cuốn chỉ được gia hạn tối đa 1 lần)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_renewal_count_limit'
  ) THEN
    ALTER TABLE "borrowing_details"
    ADD CONSTRAINT chk_renewal_count_limit
    CHECK ("renewal_count" >= 0 AND "renewal_count" <= 1);
  END IF;
END $$;

-- 5. Tiền phạt không được âm
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fine_amount_non_negative'
  ) THEN
    ALTER TABLE "fines"
    ADD CONSTRAINT chk_fine_amount_non_negative
    CHECK ("amount" >= 0);
  END IF;
END $$;

-- 6. Khi trạng thái tiền phạt là PAID, bắt buộc phải có đủ thông tin thanh toán:
-- - Ngày nộp (paid_at IS NOT NULL)
-- - Người thu tiền (collected_by_id IS NOT NULL)
-- - Mã biên lai (receipt_number IS NOT NULL và không được là chuỗi rỗng / chỉ chứa khoảng trắng)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fine_paid_info'
  ) THEN
    ALTER TABLE "fines"
    ADD CONSTRAINT chk_fine_paid_info
    CHECK (
      "status" != 'PAID'::"FineStatus" OR (
        "paid_at" IS NOT NULL AND
        "collected_by_id" IS NOT NULL AND
        "receipt_number" IS NOT NULL AND
        length(trim("receipt_number")) > 0
      )
    );
  END IF;
END $$;

-- 7. Khi trạng thái tiền phạt là WAIVED (miễn giảm), bắt buộc phải có lý do miễn giảm
-- và lý do không được là chuỗi rỗng hoặc chỉ chứa khoảng trắng
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fine_waived_reason'
  ) THEN
    ALTER TABLE "fines"
    ADD CONSTRAINT chk_fine_waived_reason
    CHECK (
      "status" != 'WAIVED'::"FineStatus" OR (
        "waiver_reason" IS NOT NULL AND
        length(trim("waiver_reason")) > 0
      )
    );
  END IF;
END $$;
