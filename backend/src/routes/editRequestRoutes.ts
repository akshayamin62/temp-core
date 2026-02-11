import { Router } from 'express';
import {
  createEditRequest,
  getPendingEditRequests,
  getMyEditRequests,
  approveEditRequest,
  rejectEditRequest,
  getAllEditRequests,
} from '../controllers/editRequestController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/edit-requests
 * @desc    Create edit request
 * @access  Private (Student/Counselor)
 */
router.post('/', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR]), createEditRequest);

/**
 * @route   GET /api/edit-requests/pending
 * @desc    Get pending edit requests (for approver)
 * @access  Private (Counselor/Admin)
 */
router.get('/pending', authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]), getPendingEditRequests);

/**
 * @route   GET /api/edit-requests/my-requests
 * @desc    Get my edit requests (student view)
 * @access  Private (Student)
 */
router.get('/my-requests', authorize([USER_ROLE.STUDENT]), getMyEditRequests);

/**
 * @route   GET /api/edit-requests
 * @desc    Get all edit requests (Admin view)
 * @access  Private (Admin only)
 */
router.get('/', authorize([USER_ROLE.ADMIN]), getAllEditRequests);

/**
 * @route   PATCH /api/edit-requests/:id/approve
 * @desc    Approve edit request
 * @access  Private (Counselor/Admin)
 */
router.patch('/:id/approve', authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]), approveEditRequest);

/**
 * @route   PATCH /api/edit-requests/:id/reject
 * @desc    Reject edit request
 * @access  Private (Counselor/Admin)
 */
router.patch('/:id/reject', authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]), rejectEditRequest);

export default router;

