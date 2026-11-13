import prisma from '../../config/db';

const notificationSelect = {
  id: true,
  title: true,
  message: true,
  type: true,
  link_url: true,
  is_read: true,
  created_at: true,
};

export const getMyNotifications = async (userId: string) => {
  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { user_id: userId },
      select: notificationSelect,
      orderBy: { created_at: 'desc' },
      take: 30,
    }),
    prisma.notification.count({
      where: { user_id: userId, is_read: false },
    }),
  ]);

  return { notifications, unreadCount };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
      is_read: false,
    },
    data: { is_read: true },
  });

  if (result.count === 0) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
      select: { id: true },
    });

    if (!notification) {
      return false;
    }
  }

  return true;
};

export const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
};
