import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  createFollowUp,
  getCounselorFollowUps,
  getFollowUpSummary,
  getFollowUpById,
  updateFollowUp,
  getLeadFollowUpHistory,
  checkTimeSlotAvailability,
} from "../controllers/followUpController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Counselor and Admin routes
router.post(
  "/",
  authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]),
  createFollowUp
);

router.get(
  "/",
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorFollowUps
);

router.get(
  "/summary",
  authorize([USER_ROLE.COUNSELOR]),
  getFollowUpSummary
);

router.get(
  "/check-availability",
  authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]),
  checkTimeSlotAvailability
);

router.get(
  "/lead/:leadId/history",
  authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN]),
  getLeadFollowUpHistory
);

router.get(
  "/:followUpId",
  authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN]),
  getFollowUpById
);

router.patch(
  "/:followUpId",
  authorize([USER_ROLE.COUNSELOR, USER_ROLE.ADMIN]),
  updateFollowUp
);

export default router;
