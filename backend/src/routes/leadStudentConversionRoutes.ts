import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  requestConversion,
  getPendingConversions,
  approveConversion,
  rejectConversion,
  getConversionHistory,
  getAllConversions
} from '../controllers/leadStudentConversionController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Counselor routes
router.post(
  '/request/:leadId',
  authorize(USER_ROLE.COUNSELOR),
  requestConversion
);

// Admin routes - Only the lead's admin can approve/reject (not super-admin)
router.get(
  '/pending',
  authorize(USER_ROLE.ADMIN),
  getPendingConversions
);

router.post(
  '/approve/:conversionId',
  authorize(USER_ROLE.ADMIN),
  approveConversion
);

router.post(
  '/reject/:conversionId',
  authorize(USER_ROLE.ADMIN),
  rejectConversion
);

// History for a specific lead
router.get(
  '/history/:leadId',
  authorize(USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN),
  getConversionHistory
);

// Super admin can see all conversions
router.get(
  '/all',
  authorize(USER_ROLE.SUPER_ADMIN),
  getAllConversions
);

export default router;
