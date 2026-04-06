import express from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  deleteActivity,
  activityFileUploadMiddleware,
} from '../controllers/activity.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = express.Router();

// All activity routes are SUPER_ADMIN only
router.use(authorize(USER_ROLE.SUPER_ADMIN));

// Create activity (superadmin only)
router.post('/', activityFileUploadMiddleware, createActivity);

// Get all activities (can filter by pointerNo)
router.get('/', getActivities);

// Get activity by ID
router.get('/:id', getActivityById);

// Delete activity (superadmin only)
router.delete('/:id', deleteActivity);

export default router;
