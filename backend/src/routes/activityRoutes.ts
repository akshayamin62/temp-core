import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMonthlyFocus,
  upsertMonthlyFocus,
  getDailyPlanner,
  upsertDailyPlanner,
  getMonthSummary,
  getActivityAnalytics,
  upsertFeedback,
  getFeedback,
  deleteFeedback,
} from '../controllers/activityController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Monthly Focus
router.get('/:registrationId/monthly-focus', getMonthlyFocus);
router.put('/:registrationId/monthly-focus', upsertMonthlyFocus);

// Daily Planner
router.get('/:registrationId/planner', getDailyPlanner);
router.put('/:registrationId/planner', upsertDailyPlanner);

// Month summary (calendar dots)
router.get('/:registrationId/month-summary', getMonthSummary);

// Analytics
router.get('/:registrationId/analytics', getActivityAnalytics);

// Feedback
router.get('/:registrationId/feedback', getFeedback);
router.put('/:registrationId/feedback', upsertFeedback);
router.delete('/:registrationId/feedback/:feedbackId', deleteFeedback);

export default router;
