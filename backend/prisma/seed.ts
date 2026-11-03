
import 'dotenv/config';
import { PrismaClient, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 1. Danh sách vai trò mặc định
const roles = [
  {
    code: 'ADMIN',
    name: 'Quản trị viên',
    description: 'Quản lý toàn bộ hệ thống thư viện.',
  },
  {
    code: 'LIBRARIAN',
    name: 'Thủ thư',
    description: 'Quản lý các nghiệp vụ thư viện.',
  },
  {
    code: 'READER',
    name: 'Độc giả',
    description: 'Sử dụng các chức năng dành cho độc giả.',
  },
];

// 2. Danh sách quyền
const permissions = [
  { code: 'users:view', name: 'Xem tài khoản', module: 'USERS' },
  { code: 'users:create', name: 'Tạo tài khoản', module: 'USERS' },
  { code: 'users:update', name: 'Cập nhật tài khoản', module: 'USERS' },
  { code: 'users:lock', name: 'Khóa tài khoản', module: 'USERS' },
  { code: 'users:approve', name: 'Duyệt độc giả', module: 'USERS' },

  { code: 'roles:view', name: 'Xem vai trò', module: 'RBAC' },
  { code: 'roles:manage', name: 'Quản lý vai trò và quyền', module: 'RBAC' },

  { code: 'books:view', name: 'Xem đầu sách', module: 'CATALOG' },
  { code: 'books:create', name: 'Thêm đầu sách', module: 'CATALOG' },
  { code: 'books:update', name: 'Sửa đầu sách', module: 'CATALOG' },
  { code: 'books:delete', name: 'Xóa đầu sách', module: 'CATALOG' },
  { code: 'copies:manage', name: 'Quản lý bản sách', module: 'CATALOG' },
  { code: 'categories:manage', name: 'Quản lý thể loại', module: 'CATALOG' },
  { code: 'authors:manage', name: 'Quản lý tác giả', module: 'CATALOG' },
  { code: 'publishers:manage', name: 'Quản lý nhà xuất bản', module: 'CATALOG' },

  { code: 'circulation:view', name: 'Xem phiếu mượn', module: 'CIRCULATION' },
  { code: 'circulation:checkout', name: 'Cho mượn sách', module: 'CIRCULATION' },
  { code: 'circulation:checkin', name: 'Nhận trả sách', module: 'CIRCULATION' },
  { code: 'circulation:renew', name: 'Gia hạn sách', module: 'CIRCULATION' },

  { code: 'reservations:view', name: 'Xem đặt trước', module: 'RESERVATIONS' },
  { code: 'reservations:manage', name: 'Quản lý đặt trước', module: 'RESERVATIONS' },
  { code: 'reservations:create', name: 'Đặt trước sách', module: 'RESERVATIONS' },
  { code: 'reservations:cancel', name: 'Hủy đặt trước', module: 'RESERVATIONS' },

  { code: 'fines:view', name: 'Xem tiền phạt', module: 'FINES' },
  { code: 'fines:collect', name: 'Thu tiền phạt', module: 'FINES' },
  { code: 'fines:waive', name: 'Miễn giảm tiền phạt', module: 'FINES' },

  { code: 'reports:view', name: 'Xem báo cáo', module: 'REPORTS' },
  { code: 'settings:manage', name: 'Quản lý cấu hình', module: 'SETTINGS' },
  { code: 'audit_logs:view', name: 'Xem nhật ký hệ thống', module: 'SYSTEM' },

  { code: 'profile:view', name: 'Xem hồ sơ cá nhân', module: 'READER' },
  { code: 'profile:update', name: 'Cập nhật hồ sơ cá nhân', module: 'READER' },
  { code: 'reader:loans:view', name: 'Xem lịch sử mượn sách', module: 'READER' },
  { code: 'reader:fines:view', name: 'Xem khoản phạt cá nhân', module: 'READER' },
];

const librarianPermissions = [
  'users:view', 'users:approve',
  'books:view', 'books:create', 'books:update',
  'copies:manage', 'categories:manage',
  'authors:manage', 'publishers:manage',
  'circulation:view', 'circulation:checkout',
  'circulation:checkin', 'circulation:renew',
  'reservations:view', 'reservations:manage',
  'fines:view', 'fines:collect', 'fines:waive',
  'reports:view',
];

const readerPermissions = [
  'books:view',
  'reservations:view', 'reservations:create', 'reservations:cancel',
  'profile:view', 'profile:update',
  'reader:loans:view', 'reader:fines:view',
];

async function main() {
  // Kiểm tra thông tin Admin từ file .env
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim();

  if (!adminEmail || !adminPassword || !adminName) {
    throw new Error(
      'Thiếu ADMIN_EMAIL, ADMIN_PASSWORD hoặc ADMIN_NAME trong file .env',
    );
  }

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD phải có ít nhất 12 ký tự.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    // 3. Tạo hoặc cập nhật vai trò
    for (const role of roles) {
      await tx.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
        },
        create: role,
      });
    }

    // 4. Tạo hoặc cập nhật quyền
    for (const permission of permissions) {
      await tx.permission.upsert({
        where: { code: permission.code },
        update: {
          name: permission.name,
          module: permission.module,
        },
        create: permission,
      });
    }

    const savedPermissions = await tx.permission.findMany();

    const permissionMap = new Map(
      savedPermissions.map((permission) => [
        permission.code,
        permission.id,
      ]),
    );

    const adminRole = await tx.role.findUniqueOrThrow({
      where: { code: 'ADMIN' },
    });

    const librarianRole = await tx.role.findUniqueOrThrow({
      where: { code: 'LIBRARIAN' },
    });

    const readerRole = await tx.role.findUniqueOrThrow({
      where: { code: 'READER' },
    });

    // 5. Gán quyền cho từng vai trò
    const roleAssignments = [
      {
        roleId: adminRole.id,
        permissionCodes: permissions.map((p) => p.code),
      },
      {
        roleId: librarianRole.id,
        permissionCodes: librarianPermissions,
      },
      {
        roleId: readerRole.id,
        permissionCodes: readerPermissions,
      },
    ];

    for (const assignment of roleAssignments) {
      for (const code of assignment.permissionCodes) {
        const permissionId = permissionMap.get(code);

        if (!permissionId) {
          throw new Error(`Không tìm thấy quyền: ${code}`);
        }

        await tx.rolePermission.upsert({
          where: {
            role_id_permission_id: {
              role_id: assignment.roleId,
              permission_id: permissionId,
            },
          },
          update: {},
          create: {
            role_id: assignment.roleId,
            permission_id: permissionId,
          },
        });
      }
    }

    // 6. Tạo tài khoản Admin nếu chưa tồn tại
    const existingAdmin = await tx.user.findUnique({
      where: { email: adminEmail },
      include: { user_roles: { include: { role: true } } },
    });

    let adminUserId: string;

    if (existingAdmin) {
      const alreadyAdmin = existingAdmin.user_roles.some(
        (userRole) => userRole.role.code === 'ADMIN',
      );

      if (!alreadyAdmin) {
        throw new Error(
          'Email Admin đã tồn tại nhưng chưa có vai trò ADMIN.',
        );
      }

      if (existingAdmin.deleted_at) {
        throw new Error(
          'Tài khoản Admin đã bị xóa mềm. Cần kiểm tra thủ công.',
        );
      }

      adminUserId = existingAdmin.id;
      console.log('Tài khoản Admin đã tồn tại, không ghi đè thông tin.');
    } else {
      const newAdmin = await tx.user.create({
        data: {
          email: adminEmail,
          password_hash: passwordHash,
          full_name: adminName,
          status: UserStatus.ACTIVE,
          user_roles: {
            create: {
              role_id: adminRole.id,
            },
          },
        },
      });

      adminUserId = newAdmin.id;
      console.log('Đã tạo tài khoản Admin mặc định.');
    }

    // 7. Đảm bảo Admin có vai trò ADMIN
    await tx.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: adminUserId,
          role_id: adminRole.id,
        },
      },
      update: {},
      create: {
        user_id: adminUserId,
        role_id: adminRole.id,
      },
    });

    // 8. Danh mục sách
    const categoryData = [
      {
        name: 'Công nghệ thông tin',
        slug: 'cong-nghe-thong-tin',
        description: 'Sách về lập trình và công nghệ thông tin.',
      },
      {
        name: 'Khoa học máy tính',
        slug: 'khoa-hoc-may-tinh',
        description: 'Sách về khoa học máy tính và thuật toán.',
      },
      {
        name: 'Kỹ năng học tập',
        slug: 'ky-nang-hoc-tap',
        description: 'Sách phục vụ học tập và nghiên cứu.',
      },
    ];

    const categoryMap = new Map<string, number>();

    for (const category of categoryData) {
      const saved = await tx.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
        },
        create: category,
      });

      categoryMap.set(category.name, saved.id);
    }

    // 9. Tác giả
    const authorData = [
      { name: 'Nguyễn Văn A', bio: 'Tác giả sách công nghệ thông tin.' },
      { name: 'Trần Văn B', bio: 'Tác giả sách khoa học máy tính.' },
      { name: 'Lê Thị C', bio: 'Tác giả tài liệu học tập.' },
      { name: 'Robert C. Martin', bio: 'Tác giả sách Clean Code.' },
      { name: 'Joshua Bloch', bio: 'Tác giả sách Effective Java.' },
      { name: 'Martin Kleppmann', bio: 'Tác giả sách về hệ thống dữ liệu.' },
      { name: 'Thomas H. Cormen', bio: 'Đồng tác giả sách thuật toán.' },
      { name: 'Eric Matthes', bio: 'Tác giả sách Python.' },
      { name: 'Al Sweigart', bio: 'Tác giả sách tự động hóa với Python.' },
      { name: 'Abraham Silberschatz', bio: 'Tác giả sách hệ cơ sở dữ liệu.' },
      { name: 'Regina O. Obe', bio: 'Tác giả sách PostgreSQL.' },
      { name: 'Kathy Sierra', bio: 'Đồng tác giả sách Head First Java.' },
    ];

    const authorMap = new Map<string, number>();

    for (const author of authorData) {
      let saved = await tx.author.findFirst({
        where: { name: author.name },
      });

      if (!saved) {
        saved = await tx.author.create({ data: author });
      }

      authorMap.set(author.name, saved.id);
    }

    // 10. Nhà xuất bản
    const publisherData = [
      {
        name: 'Nhà xuất bản Giáo dục Việt Nam',
        address: 'Hà Nội, Việt Nam',
      },
      {
        name: 'Nhà xuất bản Khoa học và Kỹ thuật',
        address: 'Hà Nội, Việt Nam',
      },
    ];

    const publisherMap = new Map<string, number>();

    for (const publisher of publisherData) {
      let saved = await tx.publisher.findFirst({
        where: { name: publisher.name },
      });

      if (!saved) {
        saved = await tx.publisher.create({ data: publisher });
      }

      publisherMap.set(publisher.name, saved.id);
    }

    // 11. Danh sách 12 đầu sách mẫu
    const bookData = [
      {
        isbn: '9786040010001',
        title: 'Lập trình Java cơ bản',
        summary: 'Giới thiệu kiến thức nền tảng về ngôn ngữ Java.',
        publication_year: 2024,
        page_count: 250,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9786040010001-L.jpg',
        publisher: 'Nhà xuất bản Giáo dục Việt Nam',
        authors: ['Nguyễn Văn A'],
        categories: ['Công nghệ thông tin'],
      },
      {
        isbn: '9786040010002',
        title: 'Cơ sở dữ liệu PostgreSQL',
        summary: 'Tìm hiểu hệ quản trị cơ sở dữ liệu PostgreSQL.',
        publication_year: 2025,
        page_count: 320,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9786040010002-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Trần Văn B'],
        categories: ['Công nghệ thông tin', 'Khoa học máy tính'],
      },
      {
        isbn: '9786040010003',
        title: 'Nhập môn Công nghệ phần mềm',
        summary: 'Các kiến thức cơ bản về phân tích và phát triển phần mềm.',
        publication_year: 2024,
        page_count: 280,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9786040010003-L.jpg',
        publisher: 'Nhà xuất bản Giáo dục Việt Nam',
        authors: ['Lê Thị C'],
        categories: ['Công nghệ thông tin', 'Kỹ năng học tập'],
      },
      {
        isbn: '9780132350884',
        title: 'Clean Code',
        summary: 'Các nguyên tắc viết mã nguồn sạch, dễ đọc và dễ bảo trì.',
        publication_year: 2008,
        page_count: 464,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Robert C. Martin'],
        categories: ['Công nghệ thông tin'],
      },
      {
        isbn: '9780134685991',
        title: 'Effective Java',
        summary: 'Các kỹ thuật lập trình Java hiệu quả và chuyên nghiệp.',
        publication_year: 2018,
        page_count: 416,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780134685991-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Joshua Bloch'],
        categories: ['Công nghệ thông tin'],
      },
      {
        isbn: '9781449373320',
        title: 'Designing Data-Intensive Applications',
        summary: 'Thiết kế hệ thống xử lý và lưu trữ dữ liệu quy mô lớn.',
        publication_year: 2017,
        page_count: 616,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Martin Kleppmann'],
        categories: ['Khoa học máy tính'],
      },
      {
        isbn: '9780262046305',
        title: 'Introduction to Algorithms',
        summary: 'Giới thiệu cấu trúc dữ liệu và các thuật toán cơ bản.',
        publication_year: 2022,
        page_count: 1312,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780262046305-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Thomas H. Cormen'],
        categories: ['Khoa học máy tính'],
      },
      {
        isbn: '9781593279288',
        title: 'Python Crash Course',
        summary: 'Hướng dẫn học Python từ cơ bản đến thực hành.',
        publication_year: 2019,
        page_count: 544,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781593279288-L.jpg',
        publisher: 'Nhà xuất bản Giáo dục Việt Nam',
        authors: ['Eric Matthes'],
        categories: ['Công nghệ thông tin'],
      },
      {
        isbn: '9781593279929',
        title: 'Automate the Boring Stuff with Python',
        summary: 'Ứng dụng Python để tự động hóa các công việc thường ngày.',
        publication_year: 2019,
        page_count: 592,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781593279929-L.jpg',
        publisher: 'Nhà xuất bản Giáo dục Việt Nam',
        authors: ['Al Sweigart'],
        categories: ['Công nghệ thông tin'],
      },
      {
        isbn: '9780073523323',
        title: 'Database System Concepts',
        summary: 'Kiến thức nền tảng về hệ quản trị cơ sở dữ liệu.',
        publication_year: 2019,
        page_count: 1376,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780073523323-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Abraham Silberschatz'],
        categories: ['Khoa học máy tính'],
      },
      {
        isbn: '9781491963418',
        title: 'PostgreSQL: Up and Running',
        summary: 'Hướng dẫn cài đặt, quản trị và sử dụng PostgreSQL.',
        publication_year: 2017,
        page_count: 234,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781491963418-L.jpg',
        publisher: 'Nhà xuất bản Khoa học và Kỹ thuật',
        authors: ['Regina O. Obe'],
        categories: ['Công nghệ thông tin', 'Khoa học máy tính'],
      },
      {
        isbn: '9781491910771',
        title: 'Head First Java',
        summary: 'Học lập trình Java thông qua ví dụ và hình minh họa.',
        publication_year: 2022,
        page_count: 752,
        cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781491910771-L.jpg',
        publisher: 'Nhà xuất bản Giáo dục Việt Nam',
        authors: ['Kathy Sierra'],
        categories: ['Công nghệ thông tin', 'Kỹ năng học tập'],
      },
    ];

    // 12. Tạo đầu sách và liên kết tác giả, thể loại
    for (const book of bookData) {
      const publisherId = publisherMap.get(book.publisher);

      if (!publisherId) {
        throw new Error(`Không tìm thấy nhà xuất bản: ${book.publisher}`);
      }

      const savedBook = await tx.book.upsert({
        where: { isbn: book.isbn },
        update: {
          title: book.title,
          summary: book.summary,
          publication_year: book.publication_year,
          page_count: book.page_count,
          cover_image_url: book.cover_image_url,
          publisher_id: publisherId,
          deleted_at: null,
        },
        create: {
          isbn: book.isbn,
          title: book.title,
          summary: book.summary,
          publication_year: book.publication_year,
          page_count: book.page_count,
          cover_image_url: book.cover_image_url,
          publisher_id: publisherId,
        },
      });

      // Đồng bộ tác giả
      await tx.bookAuthor.deleteMany({
        where: { book_id: savedBook.id },
      });

      for (const authorName of book.authors) {
        const authorId = authorMap.get(authorName);

        if (!authorId) {
          throw new Error(`Không tìm thấy tác giả: ${authorName}`);
        }

        await tx.bookAuthor.create({
          data: {
            book_id: savedBook.id,
            author_id: authorId,
          },
        });
      }

      // Đồng bộ thể loại
      await tx.bookCategory.deleteMany({
        where: { book_id: savedBook.id },
      });

      for (const categoryName of book.categories) {
        const categoryId = categoryMap.get(categoryName);

        if (!categoryId) {
          throw new Error(`Không tìm thấy thể loại: ${categoryName}`);
        }

        await tx.bookCategory.create({
          data: {
            book_id: savedBook.id,
            category_id: categoryId,
          },
        });
      }

      // Tạo 2 bản sách cho mỗi đầu sách
      for (let copyNumber = 1; copyNumber <= 2; copyNumber++) {
        const barcode = `LIB-${book.isbn}-${copyNumber}`;

        await tx.bookCopy.upsert({
          where: { barcode },
          update: {},
          create: {
            book_id: savedBook.id,
            barcode,
            shelf_location: 'Kệ A1 - Tầng 2',
            condition: 'GOOD',
            status: 'AVAILABLE',
          },
        });
      }
    }

    console.log(`Đã tạo/cập nhật ${bookData.length} đầu sách mẫu.`);
    console.log(`Tổng số bản sách dự kiến: ${bookData.length * 2}.`);
  }, {
    maxWait: 10000,
    timeout: 60000,
  });

  console.log('Seed dữ liệu hoàn tất.');
  console.log(`Số vai trò: ${roles.length}`);
  console.log(`Số quyền: ${permissions.length}`);
  console.log('Đã kiểm tra liên kết phân quyền.');
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
