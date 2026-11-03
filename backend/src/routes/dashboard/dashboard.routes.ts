import { Router } from 'express';
import * as dashboardController from '../../controllers/dashboard/dashboard.controller';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateAccessToken);

router.get(
  '/overview',
  requireRole('ADMIN', 'LIBRARIAN'),
  dashboardController.getDashboardOverview,
);

export default router;