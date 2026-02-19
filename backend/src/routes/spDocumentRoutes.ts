import express from "express";
import {
  uploadSPDocument,
  uploadCompanyLogo,
  getSPDocuments,
  getMySPDocuments,
  viewSPDocument,
  downloadSPDocument,
  approveSPDocument,
  rejectSPDocument,
  deleteSPDocument,
} from "../controllers/spDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload, handleMulterError } from "../middleware/upload";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload SP document (Service Provider or Super Admin)
router.post(
  "/upload",
  authorize(USER_ROLE.SERVICE_PROVIDER, USER_ROLE.SUPER_ADMIN),
  upload.single("file"),
  handleMulterError,
  uploadSPDocument
);

// Upload company logo (Service Provider or Super Admin)
router.post(
  "/logo",
  authorize(USER_ROLE.SERVICE_PROVIDER, USER_ROLE.SUPER_ADMIN),
  upload.single("file"),
  handleMulterError,
  uploadCompanyLogo
);

// Get my documents (Service Provider)
router.get(
  "/my-documents",
  authorize(USER_ROLE.SERVICE_PROVIDER),
  getMySPDocuments
);

// Get documents for a specific SP (Super Admin or Service Provider)
router.get(
  "/:serviceProviderId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.SERVICE_PROVIDER),
  getSPDocuments
);

// View SP document (inline)
router.get(
  "/:documentId/view",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.SERVICE_PROVIDER),
  viewSPDocument
);

// Download SP document
router.get(
  "/:documentId/download",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.SERVICE_PROVIDER),
  downloadSPDocument
);

// Approve SP document (Super Admin only)
router.put(
  "/:documentId/approve",
  authorize(USER_ROLE.SUPER_ADMIN),
  approveSPDocument
);

// Reject SP document (Super Admin only)
router.put(
  "/:documentId/reject",
  authorize(USER_ROLE.SUPER_ADMIN),
  rejectSPDocument
);

// Delete SP document (Super Admin only)
router.delete(
  "/:documentId",
  authorize(USER_ROLE.SUPER_ADMIN),
  deleteSPDocument
);

export default router;
