import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getAdvisorLeads,
  getAdvisorLeadDetail,
  updateAdvisorLeadStage,
  createAdvisorFollowUp,
  getAdvisorFollowUps,
  getAdvisorFollowUpSummary,
  updateAdvisorFollowUp,
  getAdvisorLeadFollowUpHistory,
  convertAdvisorLead,
  getAdvisorStudents,
  getAdvisorStudentDetail,
  getAdvisorParents,
  getAdvisorPricing,
  setAdvisorPricing,
  getAdvisorEnquiryFormUrl,
  getAdvisorDashboardStats,
  getAdvisorStudentFormAnswers,
  getAdvisorStudentByLeadId,
} from "../controllers/advisorController";
import {
  initiateTransfer,
  getAdvisorTransfers,
  cancelTransfer,
} from "../controllers/studentTransferController";

const router = Router();

// All routes require authentication and ADVISOR role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADVISOR]));

// ============= DASHBOARD =============
router.get("/dashboard", getAdvisorDashboardStats);

// ============= LEADS =============
router.get("/leads", getAdvisorLeads);
router.get("/leads/:leadId", getAdvisorLeadDetail);
router.patch("/leads/:leadId/stage", updateAdvisorLeadStage);

// ============= FOLLOW-UPS =============
router.post("/follow-ups", createAdvisorFollowUp);
router.get("/follow-ups", getAdvisorFollowUps);
router.get("/follow-ups/summary", getAdvisorFollowUpSummary);
router.patch("/follow-ups/:followUpId", updateAdvisorFollowUp);
router.get("/leads/:leadId/follow-ups", getAdvisorLeadFollowUpHistory);

// ============= LEAD CONVERSION =============
router.post("/leads/:leadId/convert", convertAdvisorLead);
router.get("/leads/:leadId/student", getAdvisorStudentByLeadId);

// ============= STUDENTS =============
router.get("/students", getAdvisorStudents);
router.get("/students/:studentId", getAdvisorStudentDetail);
router.get("/students/:studentId/registrations/:registrationId/answers", getAdvisorStudentFormAnswers);

// ============= STUDENT TRANSFER =============
router.post("/students/:studentId/transfer", initiateTransfer);
router.get("/transfers", getAdvisorTransfers);
router.post("/transfers/:transferId/cancel", cancelTransfer);

// ============= PARENTS =============
router.get("/parents", getAdvisorParents);

// ============= SERVICE PRICING =============
router.get("/service-pricing/:serviceSlug", getAdvisorPricing);
router.put("/service-pricing/:serviceSlug", setAdvisorPricing);

// ============= ENQUIRY FORM =============
router.get("/enquiry-form-url", getAdvisorEnquiryFormUrl);

export default router;
