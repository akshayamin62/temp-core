import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import { checkAdvisoryRegistrationAccess } from '../middleware/advisoryStudentOwnership';
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

// Get brainography report for a registration
router.get(
  '/:registrationId',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISORY]),
  checkAdvisoryRegistrationAccess,
  getBrainography
);

// Download brainography report
router.get(
  '/:registrationId/download',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISORY]),
  checkAdvisoryRegistrationAccess,
  downloadBrainography
);

// Upload brainography report (Eduplan Coach, Super Admin, Admin, Counselor, or Advisory)
router.post(
  '/:registrationId/upload',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.ADVISORY]),
  upload.single('file'),
  uploadBrainography
);

// Delete brainography report (Eduplan Coach, Super Admin, Admin, Counselor, or Advisory)
router.delete(
  '/:registrationId',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.ADVISORY]),
  deleteBrainography
);

export default router;
