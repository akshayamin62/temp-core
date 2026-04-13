import express from 'express';
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from '../types/roles';
import {
  getAdminStudents,
  getAdminStudentDetails,
  getAdminStudentFormAnswers,
  getStudentByLeadId,
  assignCounselorToStudent,
} from '../controllers/adminStudentController';
import { sendMessageToStudent } from '../controllers/superAdminStudentController';

const router = express.Router();

// All routes require authentication and admin/counselor/super-admin role
// ADVISORY uses its own /advisory/students routes — do NOT add ADVISORY here
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

// Send message to student
router.post('/:studentId/send-message', sendMessageToStudent);

// Assign counselor to student (admin only)
router.patch('/:studentId/assign-counselor', assignCounselorToStudent);

export default router;
