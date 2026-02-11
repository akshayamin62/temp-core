import { Router } from 'express';
import {
  saveAnswer,
  saveSectionAnswers,
  getServiceAnswers,
  addSectionInstance,
  removeSectionInstance,
  submitForm,
  getStudentAnswers,
} from '../controllers/answerController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/answers/save-section
 * @desc    Save entire section answers at once (bulk save)
 * @access  Private (Student only)
 */
router.post('/save-section', authorize([USER_ROLE.STUDENT]), saveSectionAnswers);

/**
 * @route   POST /api/answers/save
 * @desc    Save/Update answer for a question (legacy - kept for compatibility)
 * @access  Private (Student only)
 */
router.post('/save', authorize([USER_ROLE.STUDENT]), saveAnswer);

/**
 * @route   GET /api/answers/service/:serviceId
 * @desc    Get answers for a service (with auto-fill)
 * @access  Private (Student only)
 */
router.get('/service/:serviceId', authorize([USER_ROLE.STUDENT]), getServiceAnswers);

/**
 * @route   POST /api/answers/add-section-instance
 * @desc    Add new instance of repeatable section
 * @access  Private (Student only)
 */
router.post('/add-section-instance', authorize([USER_ROLE.STUDENT]), addSectionInstance);

/**
 * @route   DELETE /api/answers/remove-section-instance
 * @desc    Remove instance of repeatable section
 * @access  Private (Student only)
 */
router.delete('/remove-section-instance', authorize([USER_ROLE.STUDENT]), removeSectionInstance);

/**
 * @route   POST /api/answers/submit
 * @desc    Submit form (mark enrollment as submitted)
 * @access  Private (Student only)
 */
router.post('/submit', authorize([USER_ROLE.STUDENT]), submitForm);

/**
 * @route   GET /api/answers/student/:studentId
 * @desc    Get all answers for a student (Admin/Counselor view)
 * @access  Private (Admin/Counselor only)
 */
router.get('/student/:studentId', authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]), getStudentAnswers);

export default router;

