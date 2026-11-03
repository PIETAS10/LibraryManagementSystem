
import { Router } from 'express';
import * as reportsController from '../../controllers/reports/reports.controller';
import { authenticateAccessToken } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateAccessToken);

router.get(
  '/overview',
  requireRole('ADMIN', 'LIBRARIAN'),
  reportsController.getReportsOverview,
);

export default router;
