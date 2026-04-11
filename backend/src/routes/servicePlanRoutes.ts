import { Router } from 'express';
import {
  getPricingForStudent,
  registerServicePlan,
  upgradePlanTier,
  getAdminPricing,
  setAdminPricing,
  getSuperAdminPricing,
  setSuperAdminPricing,
  getBasePricingForAdmin,
  getAdminPricingByAdminId,
  getStudentPlanTiers,
} from '../controllers/servicePlanController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Connected roles - get a student's plan tiers (must be before /:serviceSlug routes)
router.get('/student/:studentId/plan-tiers', authenticate, authorize([USER_ROLE.STUDENT, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.SUPER_ADMIN, USER_ROLE.IVY_EXPERT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.ADVISORY]), getStudentPlanTiers);

// Student or Counselor - get pricing for their admin
router.get('/:serviceSlug/pricing', authenticate, authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR]), getPricingForStudent);

// Student - register for a plan
router.post('/:serviceSlug/register', authenticate, authorize([USER_ROLE.STUDENT]), registerServicePlan);

// Student - upgrade plan tier
router.put('/:serviceSlug/upgrade', authenticate, authorize([USER_ROLE.STUDENT]), upgradePlanTier);

// Admin/Advisory - get base pricing set by super admin
router.get('/:serviceSlug/admin/base-pricing', authenticate, authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISORY]), getBasePricingForAdmin);

// Admin/Advisory - get/set own pricing
router.get('/:serviceSlug/admin/pricing', authenticate, authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISORY]), getAdminPricing);
router.put('/:serviceSlug/admin/pricing', authenticate, authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISORY]), setAdminPricing);

// Connected roles - get a specific admin's pricing (for viewing plans)
router.get('/:serviceSlug/admin/:adminId/pricing', authenticate, authorize([USER_ROLE.STUDENT, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.SUPER_ADMIN, USER_ROLE.IVY_EXPERT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.ADVISORY]), getAdminPricingByAdminId);

// Super Admin - get/set base pricing
router.get('/:serviceSlug/super-admin/pricing', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), getSuperAdminPricing);
router.put('/:serviceSlug/super-admin/pricing', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), setSuperAdminPricing);

export default router;
