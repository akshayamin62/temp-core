import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMonthlyFocus,
  upsertMonthlyFocus,
  getDailyPlanner,
  upsertDailyPlanner,
  getMonthSummary,
  getActivityAnalytics,
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

export default router;
