
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import circulationRoutes from './routes/circulation/circulation.routes';
import fineRoutes from './routes/fines/fine.routes';
import authRoutes from './routes/auth/auth.routes';
import userRoutes from './routes/users/user.routes';
import categoryRoutes from './routes/catalog/category.routes';
import authorRoutes from './routes/catalog/author.routes';
import publisherRoutes from './routes/catalog/publisher.routes';
import bookRoutes from './routes/catalog/book.routes';
import bookCopyRoutes from './routes/catalog/book-copy.routes';
import dashboardRoutes from './routes/dashboard/dashboard.routes';
import reportsRoutes from './routes/reports/reports.routes';

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Bảo vệ HTTP Headers
app.use(helmet());

// Cấu hình CORS
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

// Đọc dữ liệu từ Request
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management System API is running',
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// User Management Routes
app.use('/api/users', userRoutes);

// Category Routes
app.use('/api/categories', categoryRoutes);

// Author Routes
app.use('/api/authors', authorRoutes);

// Publisher Routes
app.use('/api/publishers', publisherRoutes);

// Book Routes
app.use('/api/books', bookRoutes);

// Book Copy Routes
app.use('/api/book-copies', bookCopyRoutes);

// Circulation Routes
app.use('/api/circulation', circulationRoutes);

// Fine Routes
app.use('/api/fines', fineRoutes);

// Dashboard Routes
app.use('/api/dashboard', dashboardRoutes);

// Reports & Statistics Routes
app.use('/api/reports', reportsRoutes);

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`LMS Backend running at http://localhost:${PORT}`);
});
