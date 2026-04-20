import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  submitB2BEnquiry,
  getAllB2BLeads,
  getB2BLeadDetail,
  assignB2BSales,
  assignB2BOps,
  updateB2BLeadStage,
  getB2BSalesLeads,
  getB2BOpsLeads,
  getAllB2BSalesStaff,
  getAllB2BOpsStaff,
  getB2BSalesDashboardForSA,
  getB2BOpsDashboardForSA,
} from "../controllers/b2bLeadController";
import {
  getB2BStaffFollowUpsForSA,
  getB2BStaffFollowUpSummaryForSA,
} from "../controllers/b2bFollowUpController";

const router = express.Router();

// ============= PUBLIC ROUTES =============

// Submit B2B enquiry form
router.post("/public/enquiry", submitB2BEnquiry);

// ============= SUPER ADMIN ROUTES =============

// Get all B2B leads with stats
router.get(
  "/leads",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getAllB2BLeads
);

// Get all B2B Sales staff (for assignment dropdown)
router.get(
  "/sales-staff",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getAllB2BSalesStaff
);

// Get all B2B OPS staff (for assignment dropdown)
router.get(
  "/ops-staff",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getAllB2BOpsStaff
);

// Get B2B Sales person dashboard (info + leads)
router.get(
  "/sales/:salesId/dashboard",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BSalesDashboardForSA
);

// Get follow-ups for a specific B2B Sales person
router.get(
  "/sales/:salesId/follow-ups",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BStaffFollowUpsForSA
);

// Get follow-up summary for a specific B2B Sales person
router.get(
  "/sales/:salesId/follow-ups/summary",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BStaffFollowUpSummaryForSA
);

// Get B2B OPS person dashboard (info + leads)
router.get(
  "/ops/:opsId/dashboard",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BOpsDashboardForSA
);

// Get follow-ups for a specific B2B OPS person
router.get(
  "/ops/:opsId/follow-ups",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BStaffFollowUpsForSA
);

// Get follow-up summary for a specific B2B OPS person
router.get(
  "/ops/:opsId/follow-ups/summary",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getB2BStaffFollowUpSummaryForSA
);

// Assign B2B Sales to a lead
router.post(
  "/leads/:leadId/assign-sales",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  assignB2BSales
);

// Assign B2B OPS to a lead
router.post(
  "/leads/:leadId/assign-ops",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  assignB2BOps
);

// ============= SHARED ROUTES =============

// Get single B2B lead detail
router.get(
  "/leads/:leadId",
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  getB2BLeadDetail
);

// Update B2B lead stage
router.patch(
  "/leads/:leadId/stage",
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_SALES]),
  updateB2BLeadStage
);

// ============= B2B SALES ROUTES =============

// Get assigned leads for B2B Sales
router.get(
  "/sales/leads",
  authenticate,
  authorize(USER_ROLE.B2B_SALES),
  getB2BSalesLeads
);

// ============= B2B OPS ROUTES =============

// Get assigned leads for B2B OPS
router.get(
  "/ops/leads",
  authenticate,
  authorize(USER_ROLE.B2B_OPS),
  getB2BOpsLeads
);

export default router;
