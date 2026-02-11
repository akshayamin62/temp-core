import express from "express";
import {
  submitEnquiry,
  getAdminInfoBySlug,
  getAdminLeads,
  getLeadDetail,
  assignLeadToCounselor,
  updateLeadStage,
  getAdminCounselors,
  getCounselorLeads,
  getEnquiryFormUrl,
  getCounselorEnquiryFormUrl,
  getAllLeads,
} from "../controllers/leadController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// ============= PUBLIC ROUTES (No Auth Required) =============

// Get admin info for enquiry form
router.get("/public/enquiry/:adminSlug/info", getAdminInfoBySlug);

// Submit enquiry form
router.post("/public/enquiry/:adminSlug/submit", submitEnquiry);

// ============= ADMIN ROUTES =============

// Get all leads for admin
router.get(
  "/admin/leads",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getAdminLeads
);

// Get admin's enquiry form URL
router.get(
  "/admin/enquiry-form-url",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getEnquiryFormUrl
);

// Get counselors for assignment dropdown
router.get(
  "/admin/counselors",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getAdminCounselors
);

// Assign lead to counselor
router.post(
  "/admin/leads/:leadId/assign",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  assignLeadToCounselor
);

// ============= COUNSELOR ROUTES =============

// Get assigned leads for counselor
router.get(
  "/counselor/leads",
  authenticate,
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorLeads
);

// Get counselor's enquiry form URL (their admin's URL)
router.get(
  "/counselor/enquiry-form-url",
  authenticate,
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorEnquiryFormUrl
);

// ============= SHARED ROUTES (Admin & Counselor) =============

// Get lead detail (Admin, Counselor, or Super Admin)
router.get(
  "/leads/:leadId",
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN]),
  getLeadDetail
);

// Update lead stage
router.patch(
  "/leads/:leadId/stage",
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  updateLeadStage
);

// ============= SUPER ADMIN ROUTES =============

// Get all leads (for analytics)
router.get(
  "/super-admin/leads",
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN]),
  getAllLeads
);

export default router;
