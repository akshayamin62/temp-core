"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const superAdminController_1 = require("../controllers/superAdminController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes require authentication and super admin role
router.use(auth_1.authenticate);
router.use((0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]));
/**
 * @route   GET /api/super-admin/users
 * @desc    Get all users with optional filters
 * @access  Super Admin only
 * @query   role, isVerified, superAdminApproved, isActive, search
 */
router.get("/users", superAdminController_1.getAllUsers);
/**
 * @route   GET /api/super-admin/stats
 * @desc    Get user statistics
 * @access  Super Admin only
 */
router.get("/stats", superAdminController_1.getUserStats);
/**
 * @route   GET /api/super-admin/pending
 * @desc    Get users pending approval
 * @access  Super Admin only
 */
router.get("/pending", superAdminController_1.getPendingApprovals);
/**
 * @route   POST /api/super-admin/users/:userId/approve
 * @desc    Approve a user
 * @access  Super Admin only
 */
router.post("/users/:userId/approve", superAdminController_1.approveUser);
/**
 * @route   POST /api/super-admin/users/:userId/reject
 * @desc    Reject a user
 * @access  Super Admin only
 * @body    reason (optional)
 */
router.post("/users/:userId/reject", superAdminController_1.rejectUser);
/**
 * @route   PATCH /api/super-admin/users/:userId/toggle-status
 * @desc    Toggle user active/inactive status
 * @access  Super Admin only
 */
router.patch("/users/:userId/toggle-status", superAdminController_1.toggleUserStatus);
/**
 * @route   DELETE /api/super-admin/users/:userId
 * @desc    Delete a user
 * @access  Super Admin only
 */
// router.delete("/users/:userId", deleteUser);
/**
 * @route   POST /api/super-admin/ops
 * @desc    Create a new OPS
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/ops", superAdminController_1.createOps);
/**
 * @route   GET /api/super-admin/ops
 * @desc    Get all ops
 * @access  Super Admin only
 */
router.get("/ops", superAdminController_1.getAllOps);
/**
 * @route   GET /api/super-admin/ivy-experts
 * @desc    Get all ivy experts
 * @access  Super Admin only
 */
router.get("/ivy-experts", superAdminController_1.getAllIvyExperts);
/**
 * @route   GET /api/super-admin/eduplan-coaches
 * @desc    Get all eduplan coaches
 * @access  Super Admin only
 */
router.get("/eduplan-coaches", superAdminController_1.getAllEduplanCoaches);
/**
 * @route   POST /api/super-admin/admin
 * @desc    Create a new Admin
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/admin", superAdminController_1.createAdmin);
/**
 * @route   GET /api/super-admin/admins
 * @desc    Get all admins for dropdown
 * @access  Super Admin only
 */
router.get("/admins", superAdminController_1.getAdmins);
/**
 * @route   GET /api/super-admin/admins/:adminId
 * @desc    Get admin details by ID
 * @access  Super Admin only
 */
router.get("/admins/:adminId", superAdminController_1.getAdminDetails);
/**
 * @route   GET /api/super-admin/admins/:adminId/dashboard
 * @desc    Get admin dashboard stats (counselors, leads, students, enquiry URL)
 * @access  Super Admin only
 */
router.get("/admins/:adminId/dashboard", superAdminController_1.getAdminDashboardStats);
/**
 * @route   GET /api/super-admin/admins/:adminId/counselors
 * @desc    Get all counselors under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/counselors", superAdminController_1.getAdminCounselorsForSuperAdmin);
/**
 * @route   GET /api/super-admin/admins/:adminId/leads
 * @desc    Get all leads under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/leads", superAdminController_1.getAdminLeadsForSuperAdmin);
/**
 * @route   GET /api/super-admin/admins/:adminId/students
 * @desc    Get all students under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/students", superAdminController_1.getAdminStudentsForSuperAdmin);
/**
 * @route   GET /api/super-admin/admins/:adminId/team-meets
 * @desc    Get all team meets for a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/team-meets", superAdminController_1.getAdminTeamMeetsForSuperAdmin);
// ============= ALL LEADS ROUTE =============
/**
 * @route   GET /api/super-admin/leads
 * @desc    Get all leads across all admins
 * @access  Super Admin only
 */
router.get("/leads", superAdminController_1.getAllLeadsForSuperAdmin);
// ============= COUNSELOR DASHBOARD ROUTES =============
/**
 * @route   GET /api/super-admin/counselors/:counselorId/dashboard
 * @desc    Get counselor detail with leads and stats
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/dashboard", superAdminController_1.getCounselorDetailForSuperAdmin);
/**
 * @route   GET /api/super-admin/counselors/:counselorId/follow-ups
 * @desc    Get counselor's follow-ups
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/follow-ups", superAdminController_1.getCounselorFollowUpsForSuperAdmin);
/**
 * @route   GET /api/super-admin/counselors/:counselorId/follow-up-summary
 * @desc    Get counselor's follow-up summary (today, missed, upcoming)
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/follow-up-summary", superAdminController_1.getCounselorFollowUpSummaryForSuperAdmin);
/**
 * @route   GET /api/super-admin/counselors/:counselorId/team-meets
 * @desc    Get counselor's team meets
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/team-meets", superAdminController_1.getCounselorTeamMeetsForSuperAdmin);
/**
 * @route   POST /api/super-admin/user
 * @desc    Create a new User by Role
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional), role, adminId (for COUNSELOR), companyName, address, companyLogo (file)
 */
router.post("/user", upload_1.uploadAdminLogo.single('companyLogo'), superAdminController_1.createUserByRole);
exports.default = router;
//# sourceMappingURL=superAdminRoutes.js.map