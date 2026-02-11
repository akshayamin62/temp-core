import express from "express";
import {
  saveFormAnswers,
  getFormAnswers,
  getProgress,
  deleteFormAnswers,
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

export default router;


