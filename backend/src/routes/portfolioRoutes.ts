import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  extractBrainographyData,
  getBrainographyData,
  updateBrainographyMeta,
  generateBothReports,
  getReportLimit,
  getPortfolios,
  downloadPortfolio,
} from '../controllers/portfolioController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Extract data from brainography PDF (Eduplan Coach or Super Admin)
router.post(
  '/:registrationId/extract',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  extractBrainographyData,
);

// Get extracted brainography data
router.get(
  '/:registrationId/data',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  getBrainographyData,
);

// Update standard / board fields (Student, Eduplan Coach, Super Admin)
router.patch(
  '/:registrationId/data',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  updateBrainographyMeta,
);

// Generate both career + development reports in one click (Student, Eduplan Coach, Super Admin)
router.post(
  '/:registrationId/generate',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  generateBothReports,
);

// Get report generation limit info
router.get(
  '/:registrationId/report-limit',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  getReportLimit,
);

// Get portfolios for a registration
router.get(
  '/:registrationId/portfolios',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  getPortfolios,
);

// Download a portfolio file
router.get(
  '/download/:portfolioId',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  downloadPortfolio,
);

export default router;
