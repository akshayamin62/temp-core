import express from "express";
import {
  getCOREDocumentFields,
  addCOREDocumentField,
  deleteCOREDocumentField,
} from "../controllers/coreDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get CORE document fields for a specific student
router.get("/:registrationId", authorize([USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]), getCOREDocumentFields);

// Add new CORE document field (Admin/OPS only)
router.post("/add", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), addCOREDocumentField);

// Delete CORE document field (Admin/OPS only)
router.delete("/:fieldId", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), deleteCOREDocumentField);

export default router;

