import { Router } from "express";
import {
  getAllUsers,
  getUserStats,
  approveUser,
  rejectUser,
  toggleUserStatus,
  // deleteUser,
  getPendingApprovals,
  createOps,
  getAllOps,
  getAllIvyExperts,
  getAllEduplanCoaches,
  createAdmin,
  getAdmins,
  getAdminDetails,
  createUserByRole,
  getAdminDashboardStats,
  getAdminCounselorsForSuperAdmin,
  getAdminLeadsForSuperAdmin,
  getAdminStudentsForSuperAdmin,
  getAdminTeamMeetsForSuperAdmin,
  getCounselorDetailForSuperAdmin,
  getCounselorFollowUpsForSuperAdmin,
  getCounselorFollowUpSummaryForSuperAdmin,
  getCounselorTeamMeetsForSuperAdmin,
  getAllLeadsForSuperAdmin,
} from "../controllers/superAdminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { uploadAdminLogo } from "../middleware/upload";

const router = Router();

// All routes require authentication and super admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.SUPER_ADMIN]));

/**
 * @route   GET /api/super-admin/users
 * @desc    Get all users with optional filters
 * @access  Super Admin only
 * @query   role, isVerified, superAdminApproved, isActive, search
 */
router.get("/users", getAllUsers);

/**
 * @route   GET /api/super-admin/stats
 * @desc    Get user statistics
 * @access  Super Admin only
 */
router.get("/stats", getUserStats);

/**
 * @route   GET /api/super-admin/pending
 * @desc    Get users pending approval
 * @access  Super Admin only
 */
router.get("/pending", getPendingApprovals);

/**
 * @route   POST /api/super-admin/users/:userId/approve
 * @desc    Approve a user
 * @access  Super Admin only
 */
router.post("/users/:userId/approve", approveUser);

/**
 * @route   POST /api/super-admin/users/:userId/reject
 * @desc    Reject a user
 * @access  Super Admin only
 * @body    reason (optional)
 */
router.post("/users/:userId/reject", rejectUser);

/**
 * @route   PATCH /api/super-admin/users/:userId/toggle-status
 * @desc    Toggle user active/inactive status
 * @access  Super Admin only
 */
router.patch("/users/:userId/toggle-status", toggleUserStatus);

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
router.post("/ops", createOps);

/**
 * @route   GET /api/super-admin/ops
 * @desc    Get all ops
 * @access  Super Admin only
 */
router.get("/ops", getAllOps);

/**
 * @route   GET /api/super-admin/ivy-experts
 * @desc    Get all ivy experts
 * @access  Super Admin only
 */
router.get("/ivy-experts", getAllIvyExperts);

/**
 * @route   GET /api/super-admin/eduplan-coaches
 * @desc    Get all eduplan coaches
 * @access  Super Admin only
 */
router.get("/eduplan-coaches", getAllEduplanCoaches);

/**
 * @route   POST /api/super-admin/admin
 * @desc    Create a new Admin
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/admin", createAdmin);

/**
 * @route   GET /api/super-admin/admins
 * @desc    Get all admins for dropdown
 * @access  Super Admin only
 */
router.get("/admins", getAdmins);

/**
 * @route   GET /api/super-admin/admins/:adminId
 * @desc    Get admin details by ID
 * @access  Super Admin only
 */
router.get("/admins/:adminId", getAdminDetails);

/**
 * @route   GET /api/super-admin/admins/:adminId/dashboard
 * @desc    Get admin dashboard stats (counselors, leads, students, enquiry URL)
 * @access  Super Admin only
 */
router.get("/admins/:adminId/dashboard", getAdminDashboardStats);

/**
 * @route   GET /api/super-admin/admins/:adminId/counselors
 * @desc    Get all counselors under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/counselors", getAdminCounselorsForSuperAdmin);

/**
 * @route   GET /api/super-admin/admins/:adminId/leads
 * @desc    Get all leads under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/leads", getAdminLeadsForSuperAdmin);

/**
 * @route   GET /api/super-admin/admins/:adminId/students
 * @desc    Get all students under a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/students", getAdminStudentsForSuperAdmin);

/**
 * @route   GET /api/super-admin/admins/:adminId/team-meets
 * @desc    Get all team meets for a specific admin
 * @access  Super Admin only
 */
router.get("/admins/:adminId/team-meets", getAdminTeamMeetsForSuperAdmin);

// ============= ALL LEADS ROUTE =============

/**
 * @route   GET /api/super-admin/leads
 * @desc    Get all leads across all admins
 * @access  Super Admin only
 */
router.get("/leads", getAllLeadsForSuperAdmin);

// ============= COUNSELOR DASHBOARD ROUTES =============

/**
 * @route   GET /api/super-admin/counselors/:counselorId/dashboard
 * @desc    Get counselor detail with leads and stats
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/dashboard", getCounselorDetailForSuperAdmin);

/**
 * @route   GET /api/super-admin/counselors/:counselorId/follow-ups
 * @desc    Get counselor's follow-ups
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/follow-ups", getCounselorFollowUpsForSuperAdmin);

/**
 * @route   GET /api/super-admin/counselors/:counselorId/follow-up-summary
 * @desc    Get counselor's follow-up summary (today, missed, upcoming)
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/follow-up-summary", getCounselorFollowUpSummaryForSuperAdmin);

/**
 * @route   GET /api/super-admin/counselors/:counselorId/team-meets
 * @desc    Get counselor's team meets
 * @access  Super Admin only
 */
router.get("/counselors/:counselorId/team-meets", getCounselorTeamMeetsForSuperAdmin);

/**
 * @route   POST /api/super-admin/user
 * @desc    Create a new User by Role
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional), role, adminId (for COUNSELOR), companyName, address, companyLogo (file)
 */
router.post("/user", uploadAdminLogo.single('companyLogo'), createUserByRole);

export default router;


