import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import { checkAdvisorRegistrationAccess } from '../middleware/advisorStudentOwnership';
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
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISOR]),
  checkAdvisorRegistrationAccess,
  getBrainography
);

// Download brainography report
router.get(
  '/:registrationId/download',
  authorize([USER_ROLE.STUDENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISOR]),
  checkAdvisorRegistrationAccess,
  downloadBrainography
);

// Upload brainography report (Eduplan Coach, Super Admin, Admin, Counselor, or Advisor)
router.post(
  '/:registrationId/upload',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.ADVISOR]),
  upload.single('file'),
  uploadBrainography
);

// Delete brainography report (Eduplan Coach, Super Admin, Admin, Counselor, or Advisor)
router.delete(
  '/:registrationId',
  authorize([USER_ROLE.EDUPLAN_COACH, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.ADVISOR]),
  deleteBrainography
);

export default router;
