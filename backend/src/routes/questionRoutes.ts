import { Router } from 'express';
import {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  toggleQuestionStatus,
  getQuestionMetadata,
} from '../controllers/questionController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/questions/metadata
 * @desc    Get question types and edit policies
 * @access  Private (Admin only)
 */
router.get('/metadata', authorize([USER_ROLE.ADMIN]), getQuestionMetadata);

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
router.post('/', authorize([USER_ROLE.ADMIN]), createQuestion);

/**
 * @route   GET /api/questions
 * @desc    Get all questions with filters
 * @access  Private (Admin only)
 */
router.get('/', authorize([USER_ROLE.ADMIN]), getAllQuestions);

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authorize([USER_ROLE.ADMIN]), getQuestionById);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
router.put('/:id', authorize([USER_ROLE.ADMIN]), updateQuestion);

/**
 * @route   PATCH /api/questions/:id/toggle-status
 * @desc    Activate/Deactivate question
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', authorize([USER_ROLE.ADMIN]), toggleQuestionStatus);

export default router;

