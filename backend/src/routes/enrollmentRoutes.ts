import { Router } from 'express';
import {
  enrollInService,
  getMyEnrollments,
  getEnrollmentById,
  updateEnrollmentStatus,
  assignCounselor,
  getAllEnrollments,
  getMyCounselingEnrollments,
} from '../controllers/enrollmentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/enrollments
 * @desc    Enroll in a service
 * @access  Private (Student only)
 */
router.post('/', authorize([USER_ROLE.STUDENT]), enrollInService);

/**
 * @route   GET /api/enrollments
 * @desc    Get my enrollments
 * @access  Private (Student only)
 */
router.get('/', authorize([USER_ROLE.STUDENT]), getMyEnrollments);

/**
 * @route   GET /api/enrollments/all
 * @desc    Get all enrollments (Admin/Counselor)
 * @access  Private (Admin/Counselor only)
 */
router.get('/all', authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]), getAllEnrollments);

/**
 * @route   GET /api/enrollments/my-students
 * @desc    Get enrollments for assigned counselor
 * @access  Private (Counselor only)
 */
router.get('/my-students', authorize([USER_ROLE.COUNSELOR]), getMyCounselingEnrollments);

/**
 * @route   GET /api/enrollments/:id
 * @desc    Get enrollment by ID
 * @access  Private (Student/Counselor/Admin)
 */
router.get('/:id', getEnrollmentById);

/**
 * @route   PATCH /api/enrollments/:id/status
 * @desc    Update enrollment status
 * @access  Private (Student/Counselor/Admin)
 */
router.patch('/:id/status', updateEnrollmentStatus);

/**
 * @route   PATCH /api/enrollments/:id/assign-counselor
 * @desc    Assign counselor to enrollment
 * @access  Private (Admin only)
 */
router.patch('/:id/assign-counselor', authorize([USER_ROLE.ADMIN]), assignCounselor);

export default router;

