import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
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

// Read access — all roles that may be associated with a student
const readRoles = [
  USER_ROLE.STUDENT,
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.EDUPLAN_COACH,
  USER_ROLE.OPS,
  USER_ROLE.COUNSELOR,
  USER_ROLE.ADMIN,
  USER_ROLE.ADVISORY,
  USER_ROLE.PARENT,
  USER_ROLE.REFERRER,
];

// Activity write (monthly focus, daily planner) — STUDENT only
const activityWriteRoles = [USER_ROLE.STUDENT];

// Feedback write — SUPER_ADMIN and EDUPLAN_COACH
const feedbackWriteRoles = [USER_ROLE.SUPER_ADMIN, USER_ROLE.EDUPLAN_COACH];

// Monthly Focus
router.get('/:registrationId/monthly-focus', authorize(readRoles), getMonthlyFocus);
router.put('/:registrationId/monthly-focus', authorize(activityWriteRoles), upsertMonthlyFocus);

// Daily Planner
router.get('/:registrationId/planner', authorize(readRoles), getDailyPlanner);
router.put('/:registrationId/planner', authorize(activityWriteRoles), upsertDailyPlanner);

// Month summary (calendar dots)
router.get('/:registrationId/month-summary', authorize(readRoles), getMonthSummary);

// Analytics
router.get('/:registrationId/analytics', authorize(readRoles), getActivityAnalytics);

// Feedback — read by all, write/delete by SUPER_ADMIN and EDUPLAN_COACH
router.get('/:registrationId/feedback', authorize(readRoles), getFeedback);
router.put('/:registrationId/feedback', authorize(feedbackWriteRoles), upsertFeedback);
router.delete('/:registrationId/feedback/:feedbackId', authorize(feedbackWriteRoles), deleteFeedback);

export default router;
