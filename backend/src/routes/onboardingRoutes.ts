import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getOnboardingProfile,
  updateOnboardingProfile,
  submitOnboarding,
  getOnboardingReview,
  assignOpsToProfile,
  updateCompanyDetailsByReviewer,
  updateB2BProfileByReviewer,
} from "../controllers/onboardingController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============= ADMIN/ADVISOR ONBOARDING =============

// Get onboarding profile
router.get(
  "/profile",
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  getOnboardingProfile
);

// Update onboarding profile (company details)
router.put(
  "/profile",
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  updateOnboardingProfile
);

// Submit onboarding for review
router.post(
  "/submit",
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  submitOnboarding
);

// ============= OPS / SUPER ADMIN REVIEW =============

// View onboarding progress for a specific profile
router.get(
  "/review/:profileId",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  getOnboardingReview
);

// OPS/Super Admin updates company details on a profile
router.put(
  "/review/:profileId/company-details",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  updateCompanyDetailsByReviewer
);

// OPS/Super Admin updates b2bProfileData fields on a profile
router.put(
  "/review/:profileId/b2b-profile",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  updateB2BProfileByReviewer
);

// ============= OPS ASSIGNMENT =============

// Super Admin assigns OPS to Admin/Advisor profile
router.post(
  "/assign-ops/:id",
  authorize(USER_ROLE.SUPER_ADMIN),
  assignOpsToProfile
);

export default router;
