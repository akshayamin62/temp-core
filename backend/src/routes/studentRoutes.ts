import express from "express";
import {
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
} from "../controllers/studentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// All routes require authentication + student role
router.get("/profile", authenticate, authorize(USER_ROLE.STUDENT), getStudentProfile);
router.put("/profile", authenticate, authorize(USER_ROLE.STUDENT), updateStudentProfile);
router.delete("/profile", authenticate, authorize(USER_ROLE.STUDENT), deleteStudentProfile);

export default router;


