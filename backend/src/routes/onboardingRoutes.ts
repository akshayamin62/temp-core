import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload } from "../middleware/upload";
import {
  getOnboardingProfile,
  updateOnboardingProfile,
  uploadOnboardingDocument,
  submitOnboarding,
  getOnboardingReview,
  reviewOnboardingDocument,
  assignOpsToProfile,
  viewOnboardingDocument,
  uploadOnboardingDocumentByReviewer,
  updateCompanyDetailsByReviewer,
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

// Upload a document
router.post(
  "/upload-document",
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR]),
  upload.single("document"),
  uploadOnboardingDocument
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

// Approve/reject a document
router.post(
  "/review/:profileId/document",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  reviewOnboardingDocument
);

// OPS/Super Admin uploads a document for a profile
router.post(
  "/review/:profileId/upload-document",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  upload.single("document"),
  uploadOnboardingDocumentByReviewer
);

// OPS/Super Admin updates company details on a profile
router.put(
  "/review/:profileId/company-details",
  authorize([USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  updateCompanyDetailsByReviewer
);

// View onboarding document inline (stream)
router.get(
  "/document/:profileId/:documentType/view",
  authorize([USER_ROLE.ADMIN, USER_ROLE.ADVISOR, USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  viewOnboardingDocument
);

// ============= OPS ASSIGNMENT =============

// Super Admin assigns OPS to Admin/Advisor profile
router.post(
  "/assign-ops/:id",
  authorize(USER_ROLE.SUPER_ADMIN),
  assignOpsToProfile
);

export default router;
