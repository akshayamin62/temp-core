import { Router } from 'express';
import { getStudentInterestData, patchStudentInterest } from '../controllers/studentInterest.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// GET /api/student-interest?studentIvyServiceId=xxx - Get student interest
router.get('/', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStudentInterestData);

// PATCH /api/student-interest - Update student interest (Ivy Expert only)
router.patch('/', authorize(USER_ROLE.IVY_EXPERT), patchStudentInterest);

export default router;

