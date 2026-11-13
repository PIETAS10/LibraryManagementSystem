# Library Management System

Hệ thống quản lý thư viện được xây dựng nhằm hỗ trợ quản lý sách, bạn đọc, nhân viên, mượn trả sách và các hoạt động nghiệp vụ của thư viện.

## 1. Công nghệ sử dụng

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM

### Database
- PostgreSQL

## 2. Chức năng chính

- Đăng nhập và đăng ký tài khoản.
- Phân quyền người dùng theo vai trò Admin, Librarian và Reader.
- Quản lý sách, bản sao sách, tác giả, nhà xuất bản và thể loại.
- Quản lý bạn đọc và nhân viên.
- Quản lý hoạt động mượn và trả sách.
- Theo dõi lịch sử mượn sách.
- Quản lý tiền phạt.
- Thông báo đăng ký độc giả mới, kết quả duyệt tài khoản và tiền phạt; có thể đánh dấu đã đọc.
- Thống kê và báo cáo.
- Cài đặt giao diện sáng và tối.

## 3. Cấu trúc dự án

```text
LibraryManagementSystem/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── custom_constraints.sql
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
└── .gitignore
```

## 4. Yêu cầu cài đặt

Trước khi chạy dự án, cần cài đặt:

- Node.js phiên bản 18 trở lên.
- PostgreSQL.
- Git (nếu tải dự án bằng Git).

## Chạy nhanh trên máy local (không dùng Docker)

1. Cài Node.js 18+ và PostgreSQL, sau đó khởi động PostgreSQL.
2. Tạo database `library_db` trong PostgreSQL (ví dụ qua pgAdmin).
3. Clone dự án và mở terminal tại thư mục gốc:

   ```bash
   npm run setup:local
   ```

4. Khi được hỏi, nhập `DATABASE_URL` của PostgreSQL trên máy. Nếu người dùng PostgreSQL/mật khẩu khác mặc định, hãy nhập đầy đủ URL kết nối. Có thể đổi mật khẩu Admin demo ngay tại bước thiết lập.
5. Khởi động frontend và backend cùng lúc:

   ```bash
   npm run dev
   ```

Mở http://localhost:5173. API kiểm tra trạng thái tại http://localhost:5000/api/health. Lệnh thiết lập cài dependencies, tạo `backend/.env` với JWT secrets riêng, chạy Prisma migrations, áp dụng ràng buộc bổ sung và tạo dữ liệu mẫu khi thiết lập lần đầu. File `.env` không được commit.

Nếu cần thiết lập lại database hoặc tạo lại dữ liệu mẫu, có thể chạy lệnh Prisma tương ứng trong mục hướng dẫn thủ công bên dưới. Seed có thể cập nhật một số dữ liệu mẫu.

## 5. Tải dự án

Clone repository:

```bash
git clone https://github.com/PIETAS10/LibraryManagementSystem.git
```

Di chuyển vào thư mục dự án:

```bash
cd LibraryManagementSystem
```

## 6. Cấu hình Database

### Bước 1: Tạo database

Mở PostgreSQL hoặc pgAdmin và tạo database có tên:

```text
library_db
```

### Bước 2: Cấu hình Backend (thiết lập thủ công)

Vào thư mục `backend`, sao chép file `.env.example` thành `.env`.

Mở file `.env` và chỉnh thông tin kết nối PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/library_db?schema=public"
```

Thay `YOUR_DB_PASSWORD` bằng mật khẩu PostgreSQL trên máy của bạn.

Kiểm tra các biến môi trường JWT và tài khoản Admin demo trong file `.env.example`. Thay các khóa JWT mẫu bằng chuỗi bí mật riêng nếu sử dụng ngoài môi trường demo.

### Bước 3: Cài đặt Backend

Mở terminal tại thư mục `backend`:

```bash
cd backend
npm install
```

Tạo Prisma Client:

```bash
npx prisma generate
```

Chạy migration để tạo cấu trúc database:

```bash
npx prisma migrate deploy
```

Áp dụng các ràng buộc bổ sung nếu cần:

```bash
npx prisma db execute --file prisma/custom_constraints.sql
```

Tạo dữ liệu mẫu và tài khoản Admin:

```bash
npm run prisma:seed
```

## 7. Cấu hình và chạy Frontend

Mở terminal tại thư mục `frontend`.

Sao chép file `.env.example` thành `.env`.

Kiểm tra cấu hình API:

```env
VITE_API_URL=http://localhost:5000/api
```

Cài đặt thư viện:

```bash
npm install
```

Khởi động Frontend:

```bash
npm run dev
```

## 8. Khởi động Backend

Mở một terminal riêng tại thư mục `backend`:

```bash
npm run dev
```

Sau khi khởi động:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

Giữ cả hai terminal hoạt động trong quá trình sử dụng hệ thống.

## 9. Tài khoản Admin demo

Sau khi chạy seed thành công, có thể đăng nhập bằng tài khoản demo:

| Thông tin | Giá trị |
|---|---|
| Email | admin@library.com |
| Password | Admin@123456 |
| Vai trò | ADMIN |

Đây là tài khoản dùng để thử nghiệm trên môi trường demo. Không sử dụng mật khẩu công khai này trong môi trường triển khai thực tế.

## 10. Lưu ý

- Không chia sẻ file `.env` lên GitHub.
- Chỉ sử dụng `.env.example` làm file cấu hình mẫu.
- Cần khởi động PostgreSQL trước khi chạy Backend.
- Cần chạy migration trước khi chạy seed.
- Không chạy seed nhiều lần nếu không cần thiết; seed có thể cập nhật hoặc tạo lại một số dữ liệu mẫu.
- Nếu thay đổi cấu trúc database, cần tạo và quản lý migration tương ứng.

## 11. Repository

GitHub: https://github.com/PIETAS10/LibraryManagementSystem