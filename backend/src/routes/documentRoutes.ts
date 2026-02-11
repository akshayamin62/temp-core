import express from "express";
import {
  uploadDocument,
  getDocuments,
  downloadDocument,
  viewDocument,
  approveDocument,
  rejectDocument,
  addCustomField,
  deleteDocument,
} from "../controllers/documentController";
import {
  getDocumentFields,
  addDocumentField,
  deleteDocumentField,
} from "../controllers/formFieldController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload, handleMulterError } from "../middleware/upload";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get document fields (all FILE type fields)
router.get("/fields/list", getDocumentFields);

// Add new document field (Admin/Ops only)
router.post("/fields/add", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), addDocumentField);

// Delete document field (Admin only)
router.delete("/fields/:fieldId", authorize(USER_ROLE.SUPER_ADMIN), deleteDocumentField);

// Upload document (auto-save)
router.post(
  "/upload",
  upload.single("file"),
  handleMulterError,
  uploadDocument
);

// Get all documents for a registration
router.get("/:registrationId", getDocuments);

// View specific document (inline)
router.get("/:documentId/view", viewDocument);

// Download specific document
router.get("/:documentId/download", downloadDocument);

// Approve document (OPS/Admin only)
router.put("/:documentId/approve", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS, USER_ROLE.ADMIN), approveDocument);

// Reject document (OPS/Admin only)
router.put("/:documentId/reject", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS, USER_ROLE.ADMIN), rejectDocument);

// Add custom document field (DEPRECATED - use /fields/add instead)
router.post("/add-custom-field", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), addCustomField);

// Delete document
router.delete("/:documentId", authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS, USER_ROLE.STUDENT), deleteDocument);

export default router;

