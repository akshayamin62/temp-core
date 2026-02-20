import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import { upload } from '../middleware/upload';
import {
  uploadBrainography,
  getBrainography,
  downloadBrainography,
  deleteBrainography,
} from '../controllers/brainographyController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get brainography report for a registration (student, eduplan coach, super admin only)
router.get(
  '/:registrationId',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  getBrainography
);

// Download brainography report
router.get(
  '/:registrationId/download',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  downloadBrainography
);

// Upload brainography report (Eduplan Coach or Super Admin only)
router.post(
  '/:registrationId/upload',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  upload.single('file'),
  uploadBrainography
);

// Delete brainography report (Eduplan Coach or Super Admin only)
router.delete(
  '/:registrationId',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN]),
  deleteBrainography
);

export default router;
