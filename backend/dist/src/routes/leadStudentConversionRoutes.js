"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const leadStudentConversionController_1 = require("../controllers/leadStudentConversionController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Counselor routes
router.post('/request/:leadId', (0, authorize_1.authorize)(roles_1.USER_ROLE.COUNSELOR), leadStudentConversionController_1.requestConversion);
// Admin routes - Only the lead's admin can approve/reject (not super-admin)
router.get('/pending', (0, authorize_1.authorize)(roles_1.USER_ROLE.ADMIN), leadStudentConversionController_1.getPendingConversions);
router.post('/approve/:conversionId', (0, authorize_1.authorize)(roles_1.USER_ROLE.ADMIN), leadStudentConversionController_1.approveConversion);
router.post('/reject/:conversionId', (0, authorize_1.authorize)(roles_1.USER_ROLE.ADMIN), leadStudentConversionController_1.rejectConversion);
// History for a specific lead
router.get('/history/:leadId', (0, authorize_1.authorize)(roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.SUPER_ADMIN), leadStudentConversionController_1.getConversionHistory);
// Super admin can see all conversions
router.get('/all', (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN), leadStudentConversionController_1.getAllConversions);
exports.default = router;
//# sourceMappingURL=leadStudentConversionRoutes.js.map