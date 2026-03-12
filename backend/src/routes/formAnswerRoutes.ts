import express from "express";
import {
  saveFormAnswers,
  getFormAnswers,
  getProgress,
  deleteFormAnswers,
  getStudentProfileData,
  saveStudentProfileData,
  getStudentProfileDataById,
  saveStudentProfileDataById,
} from "../controllers/formAnswerController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { validateRequest } from "../middleware/validate";

const router = express.Router();

// All routes require authentication + student role
router.post(
  "/save",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  validateRequest(["registrationId", "partKey", "answers"]),
  saveFormAnswers
);

router.get(
  "/registrations/:registrationId/answers",
  authenticate,
  authorize([USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN]),
  getFormAnswers
);

router.get(
  "/registrations/:registrationId/progress",
  authenticate,
  authorize([USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN]),
  getProgress
);

router.delete("/answers/:answerId", authenticate, authorize(USER_ROLE.STUDENT), deleteFormAnswers);

// Student profile (no registrationId needed)
router.get(
  "/student-profile",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  getStudentProfileData
);

router.put(
  "/student-profile",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  saveStudentProfileData
);

// View student profile data (for other roles)
router.get(
  "/student-profile/:studentId",
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.PARENT,
  ]),
  getStudentProfileDataById
);

// Save student profile data (for staff roles with edit access)
router.put(
  "/student-profile/:studentId",
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.OPS,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.IVY_EXPERT,
  ]),
  saveStudentProfileDataById
);

export default router;


