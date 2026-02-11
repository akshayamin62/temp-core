import express from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  deleteActivity,
  activityFileUploadMiddleware,
} from '../controllers/activity.controller';

const router = express.Router();

// Create activity (superadmin only)
router.post('/', activityFileUploadMiddleware, createActivity);

// Get all activities (can filter by pointerNo)
router.get('/', getActivities);

// Get activity by ID
router.get('/:id', getActivityById);

// Delete activity (superadmin only)
router.delete('/:id', deleteActivity);

export default router;
