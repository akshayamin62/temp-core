import express from "express";
import {
  getStudentPrefill,
  submitIvyLeagueRegistration,
  getRegistrationStatus,
} from "../controllers/ivyLeagueRegistrationController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { validateRequest } from "../middleware/validate";

const router = express.Router();

// All routes require authentication + STUDENT role
router.get(
  "/prefill",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  getStudentPrefill
);

router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  validateRequest([
    "firstName",
    "lastName",
    "parentFirstName",
    "parentLastName",
    "parentMobile",
    "parentEmail",
    "schoolName",
    "curriculum",
    "currentGrade",
  ]),
  submitIvyLeagueRegistration
);

router.get(
  "/status",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  getRegistrationStatus
);

export default router;
