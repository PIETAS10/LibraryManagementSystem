import { Request, Response } from 'express';
import * as notificationService from '../../services/notifications/notification.service';

export const getMyNotifications = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const result = await notificationService.getMyNotifications(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông báo thành công',
      data: result,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy thông báo',
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const updated = await notificationService.markAsRead(
      req.user.id,
      String(req.params.id),
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo đã đọc',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật thông báo',
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo đã đọc',
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật thông báo',
    });
  }
};
