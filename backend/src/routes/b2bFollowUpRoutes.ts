import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  createB2BFollowUp,
  getB2BSalesFollowUps,
  getB2BFollowUpSummary,
  getB2BFollowUpById,
  updateB2BFollowUp,
  getB2BLeadFollowUpHistory,
  checkB2BTimeSlotAvailability,
} from "../controllers/b2bFollowUpController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// B2B Sales / B2B OPS: Create follow-up
router.post(
  "/",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  createB2BFollowUp
);

// B2B Sales / B2B OPS: Get all follow-ups (calendar)
router.get(
  "/",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  getB2BSalesFollowUps
);

// B2B Sales / B2B OPS: Get follow-up summary
router.get(
  "/summary",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  getB2BFollowUpSummary
);

// B2B Sales / B2B OPS: Check time slot availability
router.get(
  "/check-availability",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  checkB2BTimeSlotAvailability
);

// B2B Sales / B2B OPS / Super Admin: Get follow-up history for a B2B lead
router.get(
  "/lead/:b2bLeadId/history",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  getB2BLeadFollowUpHistory
);

// B2B Sales / B2B OPS / Super Admin: Get follow-up by ID
router.get(
  "/:followUpId",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS, USER_ROLE.SUPER_ADMIN]),
  getB2BFollowUpById
);

// B2B Sales / B2B OPS: Update follow-up
router.patch(
  "/:followUpId",
  authorize([USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  updateB2BFollowUp
);

export default router;
