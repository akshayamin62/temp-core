import express from 'express';
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from '../types/roles';
import {
  getAllStudents,
  getStudentDetails,
  getStudentFormAnswers,
  updateStudentFormAnswers,
  getStudentsWithRegistrations,
  assignOps,
  switchActiveOps,
} from '../controllers/superAdminStudentController';

const router = express.Router();

// All routes require authentication and super admin/ops role
router.use(authenticate);
router.use(authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS]));

// Get all students
router.get('/', getAllStudents);

// Get students with registrations (for filtering)
router.get('/with-registrations', getStudentsWithRegistrations);

// Get student details
router.get('/:studentId', getStudentDetails);

// Get student form answers for a registration
router.get('/:studentId/registrations/:registrationId/answers', getStudentFormAnswers);

// Update student form answers
router.put('/:studentId/answers/:partKey', updateStudentFormAnswers);

// Assign ops to a registration (super admin only)
router.post('/registrations/:registrationId/assign-ops', authorize([USER_ROLE.SUPER_ADMIN]), assignOps);

// Switch active ops (super admin only)
router.post('/registrations/:registrationId/switch-active-ops', authorize([USER_ROLE.SUPER_ADMIN]), switchActiveOps);

export default router;


