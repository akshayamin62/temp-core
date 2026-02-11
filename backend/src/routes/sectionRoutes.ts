import { Router } from 'express';
import {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  toggleSectionStatus,
} from '../controllers/sectionController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/sections
 * @desc    Create a new section
 * @access  Private (Admin only)
 */
router.post('/', authorize([USER_ROLE.ADMIN]), createSection);

/**
 * @route   GET /api/sections
 * @desc    Get all sections (global or all)
 * @access  Private (Admin only)
 */
router.get('/', authorize([USER_ROLE.ADMIN]), getAllSections);

/**
 * @route   GET /api/sections/:id
 * @desc    Get section by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authorize([USER_ROLE.ADMIN]), getSectionById);

/**
 * @route   PUT /api/sections/:id
 * @desc    Update section (with reusability logic)
 * @access  Private (Admin only)
 */
router.put('/:id', authorize([USER_ROLE.ADMIN]), updateSection);

/**
 * @route   PATCH /api/sections/:id/toggle-status
 * @desc    Activate/Deactivate section
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', authorize([USER_ROLE.ADMIN]), toggleSectionStatus);

export default router;

