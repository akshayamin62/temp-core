import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  createParentInterviewSchedule,
  getParentInterviewSchedules,
  updateParentInterviewStatus,
} from '../controllers/ivyParentInterviewSchedule.controller';

const router = Router();

// POST /api/ivy/parent-interview-schedule — create
router.post(
  '/',
  authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]),
  createParentInterviewSchedule
);

// GET /api/ivy/parent-interview-schedule?candidateUserId= — list
router.get(
  '/',
  authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT]),
  getParentInterviewSchedules
);

// PATCH /api/ivy/parent-interview-schedule/:id/status — update status
router.patch(
  '/:id/status',
  authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]),
  updateParentInterviewStatus
);

export default router;
