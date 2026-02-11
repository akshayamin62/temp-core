"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const coreDocumentController_1 = require("../controllers/coreDocumentController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get CORE document fields for a specific student
router.get("/:registrationId", (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR]), coreDocumentController_1.getCOREDocumentFields);
// Add new CORE document field (Admin/OPS only)
router.post("/add", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS), coreDocumentController_1.addCOREDocumentField);
// Delete CORE document field (Admin/OPS only)
router.delete("/:fieldId", (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS), coreDocumentController_1.deleteCOREDocumentField);
exports.default = router;
//# sourceMappingURL=coreDocumentRoutes.js.map