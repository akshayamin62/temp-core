import { Router } from 'express';
import { getStudentIvyScore, getMyIvyScore, recalculateIvyScore } from '../controllers/ivyScore.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// GET /api/ivy/ivy-score/my-score - Auth-based: get logged-in student's ivy score
router.get('/my-score', authorize(USER_ROLE.STUDENT), getMyIvyScore);

// GET /api/ivy/ivy-score/:studentId - Get Ivy score for a student
router.get('/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStudentIvyScore);

// POST /api/ivy/ivy-score/recalculate/:studentId - Manually recalculate score
router.post('/recalculate/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), recalculateIvyScore);

export default router;
