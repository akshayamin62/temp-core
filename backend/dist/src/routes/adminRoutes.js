"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticate);
router.use((0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]));
/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard stats
 * @access  Admin only
 */
router.get("/stats", adminController_1.getAdminStats);
/**
 * @route   POST /api/admin/counselor
 * @desc    Create a new Counselor
 * @access  Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/counselor", adminController_1.createCounselor);
/**
 * @route   GET /api/admin/counselors
 * @desc    Get all counselors created by this admin
 * @access  Admin only
 */
router.get("/counselors", adminController_1.getCounselors);
/**
 * @route   GET /api/admin/counselor/:counselorId
 * @desc    Get counselor detail with dashboard data
 * @access  Admin only
 */
router.get("/counselor/:counselorId", adminController_1.getCounselorDetail);
/**
 * @route   GET /api/admin/counselor/:counselorId/follow-ups
 * @desc    Get counselor's follow-ups
 * @access  Admin only
 */
router.get("/counselor/:counselorId/follow-ups", adminController_1.getCounselorFollowUps);
/**
 * @route   GET /api/admin/counselor/:counselorId/follow-up-summary
 * @desc    Get counselor's follow-up summary (today, missed, upcoming)
 * @access  Admin only
 */
router.get("/counselor/:counselorId/follow-up-summary", adminController_1.getCounselorFollowUpSummary);
/**
 * @route   PATCH /api/admin/counselor/:counselorId/toggle-status
 * @desc    Toggle counselor active/inactive status
 * @access  Admin only
 */
router.patch("/counselor/:counselorId/toggle-status", adminController_1.toggleCounselorStatus);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map