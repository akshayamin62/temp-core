import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getSuperAdminArchive,
  getStaffArchive,
} from "../controllers/archiveController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Super Admin archive: all deactivated users
router.get(
  "/super-admin",
  authorize(USER_ROLE.SUPER_ADMIN),
  getSuperAdminArchive
);

// Staff archive: deactivated students & parents within scope
router.get(
  "/staff",
  authorize(
    USER_ROLE.ADMIN,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.ADVISOR
  ),
  getStaffArchive
);

export default router;
