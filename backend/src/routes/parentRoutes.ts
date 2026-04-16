import express from "express";
import {
  getParentsByStudent,
  updateParentInfo,
  addParentForStudent,
  getMyParents,
  getParentDetail,
  getParentDetailByUserId,
} from "../controllers/parentController";
import {
  getParentStudents,
  getParentStudentDetails,
  getParentStudentFormAnswers,
} from "../controllers/parentDashboardController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// ─── Parent Dashboard (logged-in parent's own data) ─────────────────
// Get all students linked to the logged-in parent
router.get(
  "/my-students",
  authenticate,
  authorize(USER_ROLE.PARENT),
  getParentStudents
);

// Get student detail (read-only for parent)
router.get(
  "/my-students/:studentId",
  authenticate,
  authorize(USER_ROLE.PARENT),
  getParentStudentDetails
);

// Get student form answers for a registration (read-only for parent)
router.get(
  "/my-students/:studentId/registrations/:registrationId/answers",
  authenticate,
  authorize(USER_ROLE.PARENT),
  getParentStudentFormAnswers
);

// All routes require authentication

// Get parents that belong to the logged-in user (role-aware)
router.get(
  "/list",
  authenticate,
  authorize(
    USER_ROLE.ADMIN,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.STUDENT,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADVISOR
  ),
  getMyParents
);

// Get a single parent detail
router.get(
  "/detail/:parentId",
  authenticate,
  authorize(
    USER_ROLE.ADMIN,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.STUDENT,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADVISOR
  ),
  getParentDetail
);

// Get a single parent detail by userId (for super-admin)
router.get(
  "/detail-by-user/:userId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getParentDetailByUserId
);

// Get parents for a student
router.get(
  "/student/:studentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.STUDENT,
    USER_ROLE.COUNSELOR,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISOR
  ),
  getParentsByStudent
);

// Update parent info (joint edit)
router.patch(
  "/:parentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN
  ),
  updateParentInfo
);

// Add a new parent for a student
router.post(
  "/student/:studentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.STUDENT
  ),
  addParentForStudent
);

export default router;
