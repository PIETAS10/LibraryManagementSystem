import { Router } from 'express';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import * as notificationController from '../../controllers/notifications/notification.controller';

const router = Router();

router.use(authenticateAccessToken);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
