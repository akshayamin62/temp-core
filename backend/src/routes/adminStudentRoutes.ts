import express from 'express';
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from '../types/roles';
import {
  getAdminStudents,
  getAdminStudentDetails,
  getAdminStudentFormAnswers,
  getStudentByLeadId,
} from '../controllers/adminStudentController';

const router = express.Router();

// All routes require authentication and admin/counselor/super-admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN]));

// Get all students under this admin
router.get('/', getAdminStudents);

// Get student by lead ID (for converted leads)
router.get('/by-lead/:leadId', getStudentByLeadId);

// Get student details
router.get('/:studentId', getAdminStudentDetails);

// Get student form answers for a registration (read-only)
router.get('/:studentId/registrations/:registrationId/answers', getAdminStudentFormAnswers);

export default router;
