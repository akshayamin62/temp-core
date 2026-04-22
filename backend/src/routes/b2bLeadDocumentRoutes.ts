import express from "express";
import {
  getB2BDocumentFields,
  addB2BDocumentField,
  deleteB2BDocumentField,
  getMyB2BDocumentFields,
  getMyB2BLeadDocuments,
  getB2BLeadDocuments,
  uploadB2BLeadDocument,
  viewB2BLeadDocument,
  approveB2BLeadDocument,
  rejectB2BLeadDocument,
  deleteB2BLeadDocument,
} from "../controllers/b2bLeadDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload, handleMulterError } from "../middleware/upload";

const router = express.Router();

router.use(authenticate);

// ─── Self-service routes for ADMIN / ADVISOR ──────────────────────────────
// These MUST come before /:leadId and /:documentId routes to avoid conflicts
router.get(
  "/my-fields",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  getMyB2BDocumentFields
);

router.get(
  "/my-documents",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  getMyB2BLeadDocuments
);

// ─── Document Fields ───────────────────────────────────────────────────────
// Get fields for a lead
router.get(
  "/fields/:leadId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getB2BDocumentFields
);

// Add field
router.post(
  "/fields",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  addB2BDocumentField
);

// Delete field
router.delete(
  "/fields/:fieldId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  deleteB2BDocumentField
);

// ─── Documents ─────────────────────────────────────────────────────────────
// Get documents for a lead (ops/admin access)
router.get(
  "/:leadId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getB2BLeadDocuments
);

// Upload document (admin/advisor can also upload their own)
router.post(
  "/upload",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS, USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  upload.single("file"),
  handleMulterError,
  uploadB2BLeadDocument
);

// View document inline (admin/advisor can view their own)
router.get(
  "/:documentId/view",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS, USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  viewB2BLeadDocument
);

// Approve document
router.put(
  "/:documentId/approve",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  approveB2BLeadDocument
);

// Reject document
router.put(
  "/:documentId/reject",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  rejectB2BLeadDocument
);

// Delete document
router.delete(
  "/:documentId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  deleteB2BLeadDocument
);

export default router;
