// Mở rộng Request của Express để lưu thông tin người dùng đã đăng nhập
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sessionId: string;
        tokenVersion: number;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

// Đảm bảo file này được xem là module TypeScript
export {};