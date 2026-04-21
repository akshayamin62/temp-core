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
  getOpsDetailForSuperAdmin,
  getOpsSchedulesForSuperAdmin,
  getOpsScheduleSummaryForSuperAdmin,
  getOpsStudentsForSuperAdmin,
  getOpsTeamMeetsForSuperAdmin,
  getServiceProviderDetail,
  getEduplanCoachDetailForSuperAdmin,
  getEduplanCoachStudentsForSuperAdmin,
  getEduplanCoachTeamMeetsForSuperAdmin,
  getIvyExpertTeamMeetsForSuperAdmin,
  editUserByRole,
  getUserWithProfile,
  getAdvisors,
  getAdvisorDetails,
  updateAdvisorServices,
  toggleAdvisorStatus,
  getAdvisorDashboardStats,
  getAdvisorLeadsForSuperAdmin,
  getAdvisorStudentsForSuperAdmin,
  getAdvisorTeamMeetsForSuperAdmin,
} from "../controllers/superAdminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { uploadAdminLogo } from "../middleware/upload";
import {
  getAllReferrersForSuperAdmin,
  createReferrerForSuperAdmin,
  toggleReferrerStatusForSuperAdmin,
  getReferrerDashboardForSuperAdmin,
} from "../controllers/referrerController";

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
 * @route   GET /api/super-admin/users/:userId/profile
 * @desc    Get user with role-specific profile for editing
 * @access  Super Admin only
 */
router.get("/users/:userId/profile", getUserWithProfile);

/**
 * @route   PUT /api/super-admin/users/:userId/edit
 * @desc    Edit user profile + role-specific fields
 * @access  Super Admin only
 */
router.put("/users/:userId/edit", uploadAdminLogo.single('companyLogo'), editUserByRole);

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
 * @route   GET /api/super-admin/ivy-experts/:ivyExpertUserId/team-meets
 * @desc    Get team meets for a specific ivy expert
 * @access  Super Admin only
 */
router.get("/ivy-experts/:ivyExpertUserId/team-meets", getIvyExpertTeamMeetsForSuperAdmin);

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

// ============= OPS DASHBOARD ROUTES (Read-Only) =============

/**
 * @route   GET /api/super-admin/ops/:opsUserId/detail
 * @desc    Get ops user details
 * @access  Super Admin only
 */
router.get("/ops/:opsUserId/detail", getOpsDetailForSuperAdmin);

/**
 * @route   GET /api/super-admin/ops/:opsUserId/schedules
 * @desc    Get all schedules for a specific ops user
 * @access  Super Admin only
 */
router.get("/ops/:opsUserId/schedules", getOpsSchedulesForSuperAdmin);

/**
 * @route   GET /api/super-admin/ops/:opsUserId/schedule-summary
 * @desc    Get schedule summary for a specific ops user
 * @access  Super Admin only
 */
router.get("/ops/:opsUserId/schedule-summary", getOpsScheduleSummaryForSuperAdmin);

/**
 * @route   GET /api/super-admin/ops/:opsUserId/students
 * @desc    Get students assigned to a specific ops user
 * @access  Super Admin only
 */
router.get("/ops/:opsUserId/students", getOpsStudentsForSuperAdmin);

/**
 * @route   GET /api/super-admin/ops/:opsUserId/team-meets
 * @desc    Get team meets for a specific ops user
 * @access  Super Admin only
 */
router.get("/ops/:opsUserId/team-meets", getOpsTeamMeetsForSuperAdmin);

// ============= SERVICE PROVIDER ROUTES =============

/**
 * @route   GET /api/super-admin/service-providers/:providerId
 * @desc    Get service provider details
 * @access  Super Admin only
 */
router.get("/service-providers/:providerId", getServiceProviderDetail);

// ============= EDUPLAN COACH DASHBOARD ROUTES (Read-Only) =============

/**
 * @route   GET /api/super-admin/eduplan-coaches/:coachUserId/detail
 * @desc    Get eduplan coach user details
 * @access  Super Admin only
 */
router.get("/eduplan-coaches/:coachUserId/detail", getEduplanCoachDetailForSuperAdmin);

/**
 * @route   GET /api/super-admin/eduplan-coaches/:coachUserId/students
 * @desc    Get students assigned to a specific eduplan coach
 * @access  Super Admin only
 */
router.get("/eduplan-coaches/:coachUserId/students", getEduplanCoachStudentsForSuperAdmin);

/**
 * @route   GET /api/super-admin/eduplan-coaches/:coachUserId/team-meets
 * @desc    Get team meets for a specific eduplan coach
 * @access  Super Admin only
 */
router.get("/eduplan-coaches/:coachUserId/team-meets", getEduplanCoachTeamMeetsForSuperAdmin);

// ============= REFERRER ROUTES =============

/**
 * @route   GET /api/super-admin/referrers
 * @desc    Get all referrers across all admins
 * @access  Super Admin only
 */
router.get("/referrers", getAllReferrersForSuperAdmin);

/**
 * @route   POST /api/super-admin/referrer
 * @desc    Create a new referrer under a specific admin
 * @access  Super Admin only
 * @body    firstName, lastName, email, mobileNumber, adminId
 */
router.post("/referrer", createReferrerForSuperAdmin);

/**
 * @route   PATCH /api/super-admin/referrer/:referrerId/toggle-status
 * @desc    Toggle referrer active/inactive status
 * @access  Super Admin only
 */
router.patch("/referrer/:referrerId/toggle-status", toggleReferrerStatusForSuperAdmin);

/**
 * @route   GET /api/super-admin/referrer/:referrerId/dashboard
 * @desc    Get referrer dashboard with leads and stats
 * @access  Super Admin only
 */
router.get("/referrer/:referrerId/dashboard", getReferrerDashboardForSuperAdmin);

// ============= ADVISOR ROUTES =============

/**
 * @route   GET /api/super-admin/advisors
 * @desc    Get all advisors with lead/student counts
 * @access  Super Admin only
 */
router.get("/advisors", getAdvisors);

/**
 * @route   GET /api/super-admin/advisors/:id
 * @desc    Get advisor details
 * @access  Super Admin only
 */
router.get("/advisors/:id", getAdvisorDetails);

/**
 * @route   PATCH /api/super-admin/advisors/:id/services
 * @desc    Update advisor allowed services
 * @access  Super Admin only
 */
router.patch("/advisors/:id/services", updateAdvisorServices);

/**
 * @route   PATCH /api/super-admin/advisors/:id/toggle-status
 * @desc    Toggle advisor active/inactive status
 * @access  Super Admin only
 */
router.patch("/advisors/:id/toggle-status", toggleAdvisorStatus);

/**
 * @route   GET /api/super-admin/advisors/:advisorId/dashboard
 * @desc    Get advisor dashboard stats
 * @access  Super Admin only
 */
router.get("/advisors/:advisorId/dashboard", getAdvisorDashboardStats);

/**
 * @route   GET /api/super-admin/advisors/:advisorId/leads
 * @desc    Get leads under a specific advisor
 * @access  Super Admin only
 */
router.get("/advisors/:advisorId/leads", getAdvisorLeadsForSuperAdmin);

/**
 * @route   GET /api/super-admin/advisors/:advisorId/students
 * @desc    Get students under a specific advisor
 * @access  Super Admin only
 */
router.get("/advisors/:advisorId/students", getAdvisorStudentsForSuperAdmin);

/**
 * @route   GET /api/super-admin/advisors/:advisorId/team-meets
 * @desc    Get team meets for a specific advisor
 * @access  Super Admin only
 */
router.get("/advisors/:advisorId/team-meets", getAdvisorTeamMeetsForSuperAdmin);

export default router;


