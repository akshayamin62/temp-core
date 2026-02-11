"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const documentController_1 = require("../controllers/documentController");
const formFieldController_1 = require("../controllers/formFieldController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get document fields (all FILE type fields)
router.get("/fields/list", formFieldController_1.getDocumentFields);
// Add new document field (Admin/Ops only)
router.post("/fields/add", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS), formFieldController_1.addDocumentField);
// Delete document field (Admin only)
router.delete("/fields/:fieldId", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN), formFieldController_1.deleteDocumentField);
// Upload document (auto-save)
router.post("/upload", upload_1.upload.single("file"), upload_1.handleMulterError, documentController_1.uploadDocument);
// Get all documents for a registration
router.get("/:registrationId", documentController_1.getDocuments);
// View specific document (inline)
router.get("/:documentId/view", documentController_1.viewDocument);
// Download specific document
router.get("/:documentId/download", documentController_1.downloadDocument);
// Approve document (OPS/Admin only)
router.put("/:documentId/approve", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.ADMIN), documentController_1.approveDocument);
// Reject document (OPS/Admin only)
router.put("/:documentId/reject", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.ADMIN), documentController_1.rejectDocument);
// Add custom document field (DEPRECATED - use /fields/add instead)
router.post("/add-custom-field", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS), documentController_1.addCustomField);
// Delete document
router.delete("/:documentId", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.STUDENT), documentController_1.deleteDocument);
exports.default = router;
//# sourceMappingURL=documentRoutes.js.map