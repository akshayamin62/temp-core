import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  extractBrainographyData,
  getBrainographyData,
  generatePortfolio,
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

// Get extracted brainography data (Student, Eduplan Coach, Super Admin)
router.get(
  '/:registrationId/data',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  getBrainographyData,
);

// Generate portfolio report (Student, Eduplan Coach, Super Admin)
router.post(
  '/:registrationId/generate',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  generatePortfolio,
);

// Get portfolios for a registration (Student, Eduplan Coach, Super Admin)
router.get(
  '/:registrationId/portfolios',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  getPortfolios,
);

// Download a portfolio file
router.get(
  '/download/:portfolioId',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  downloadPortfolio,
);

export default router;
