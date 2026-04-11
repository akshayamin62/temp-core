import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getAdvisoryLeads,
  getAdvisoryLeadDetail,
  updateAdvisoryLeadStage,
  createAdvisoryFollowUp,
  getAdvisoryFollowUps,
  getAdvisoryFollowUpSummary,
  updateAdvisoryFollowUp,
  getAdvisoryLeadFollowUpHistory,
  convertAdvisoryLead,
  getAdvisoryStudents,
  getAdvisoryStudentDetail,
  getAdvisoryParents,
  getAdvisoryPricing,
  setAdvisoryPricing,
  getAdvisoryEnquiryFormUrl,
  getAdvisoryDashboardStats,
} from "../controllers/advisoryController";
import {
  initiateTransfer,
  getAdvisoryTransfers,
  cancelTransfer,
} from "../controllers/studentTransferController";

const router = Router();

// All routes require authentication and ADVISORY role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADVISORY]));

// ============= DASHBOARD =============
router.get("/dashboard", getAdvisoryDashboardStats);

// ============= LEADS =============
router.get("/leads", getAdvisoryLeads);
router.get("/leads/:leadId", getAdvisoryLeadDetail);
router.patch("/leads/:leadId/stage", updateAdvisoryLeadStage);

// ============= FOLLOW-UPS =============
router.post("/follow-ups", createAdvisoryFollowUp);
router.get("/follow-ups", getAdvisoryFollowUps);
router.get("/follow-ups/summary", getAdvisoryFollowUpSummary);
router.patch("/follow-ups/:followUpId", updateAdvisoryFollowUp);
router.get("/leads/:leadId/follow-ups", getAdvisoryLeadFollowUpHistory);

// ============= LEAD CONVERSION =============
router.post("/leads/:leadId/convert", convertAdvisoryLead);

// ============= STUDENTS =============
router.get("/students", getAdvisoryStudents);
router.get("/students/:studentId", getAdvisoryStudentDetail);

// ============= STUDENT TRANSFER =============
router.post("/students/:studentId/transfer", initiateTransfer);
router.get("/transfers", getAdvisoryTransfers);
router.post("/transfers/:transferId/cancel", cancelTransfer);

// ============= PARENTS =============
router.get("/parents", getAdvisoryParents);

// ============= SERVICE PRICING =============
router.get("/service-pricing/:serviceSlug", getAdvisoryPricing);
router.put("/service-pricing/:serviceSlug", setAdvisoryPricing);

// ============= ENQUIRY FORM =============
router.get("/enquiry-form-url", getAdvisoryEnquiryFormUrl);

export default router;
