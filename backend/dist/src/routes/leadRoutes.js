"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leadController_1 = require("../controllers/leadController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = express_1.default.Router();
// ============= PUBLIC ROUTES (No Auth Required) =============
// Get admin info for enquiry form
router.get("/public/enquiry/:adminSlug/info", leadController_1.getAdminInfoBySlug);
// Submit enquiry form
router.post("/public/enquiry/:adminSlug/submit", leadController_1.submitEnquiry);
// ============= ADMIN ROUTES =============
// Get all leads for admin
router.get("/admin/leads", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), leadController_1.getAdminLeads);
// Get admin's enquiry form URL
router.get("/admin/enquiry-form-url", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), leadController_1.getEnquiryFormUrl);
// Get counselors for assignment dropdown
router.get("/admin/counselors", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), leadController_1.getAdminCounselors);
// Assign lead to counselor
router.post("/admin/leads/:leadId/assign", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), leadController_1.assignLeadToCounselor);
// ============= COUNSELOR ROUTES =============
// Get assigned leads for counselor
router.get("/counselor/leads", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR]), leadController_1.getCounselorLeads);
// Get counselor's enquiry form URL (their admin's URL)
router.get("/counselor/enquiry-form-url", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR]), leadController_1.getCounselorEnquiryFormUrl);
// ============= SHARED ROUTES (Admin & Counselor) =============
// Get lead detail (Admin, Counselor, or Super Admin)
router.get("/leads/:leadId", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.SUPER_ADMIN]), leadController_1.getLeadDetail);
// Update lead stage
router.patch("/leads/:leadId/stage", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR]), leadController_1.updateLeadStage);
// ============= SUPER ADMIN ROUTES =============
// Get all leads (for analytics)
router.get("/super-admin/leads", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), leadController_1.getAllLeads);
exports.default = router;
//# sourceMappingURL=leadRoutes.js.map