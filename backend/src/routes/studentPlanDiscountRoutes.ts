import { Router } from 'express';
import {
  setStudentPlanDiscount,
  getStudentPlanDiscounts,
  removeStudentPlanDiscount,
} from '../controllers/studentPlanDiscountController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Set discount for a student's plan (Admin or Advisor)
router.post(
  '/',
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  setStudentPlanDiscount
);

// Get active discounts for a student (connected roles)
router.get(
  '/student/:studentId',
  authenticate,
  authorize([USER_ROLE.STUDENT, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.SUPER_ADMIN, USER_ROLE.IVY_EXPERT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.ADVISOR]),
  getStudentPlanDiscounts
);

// Remove/deactivate a discount (Admin only)
router.delete(
  '/:discountId',
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  removeStudentPlanDiscount
);

export default router;
