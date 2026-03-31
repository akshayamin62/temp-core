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

// Set discount for a student's plan (Admin only)
router.post(
  '/',
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  setStudentPlanDiscount
);

// Get active discounts for a student
router.get(
  '/student/:studentId',
  authenticate,
  getStudentPlanDiscounts
);

// Remove/deactivate a discount (Admin only)
router.delete(
  '/:discountId',
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  removeStudentPlanDiscount
);

export default router;
