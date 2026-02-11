import { Router } from "express";
import { 
  createCounselor, 
  getCounselors, 
  toggleCounselorStatus,
  getCounselorDetail,
  getCounselorFollowUps,
  getCounselorFollowUpSummary,
  getAdminStats
} from "../controllers/adminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADMIN]));

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard stats
 * @access  Admin only
 */
router.get("/stats", getAdminStats);

/**
 * @route   POST /api/admin/counselor
 * @desc    Create a new Counselor
 * @access  Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/counselor", createCounselor);

/**
 * @route   GET /api/admin/counselors
 * @desc    Get all counselors created by this admin
 * @access  Admin only
 */
router.get("/counselors", getCounselors);

/**
 * @route   GET /api/admin/counselor/:counselorId
 * @desc    Get counselor detail with dashboard data
 * @access  Admin only
 */
router.get("/counselor/:counselorId", getCounselorDetail);

/**
 * @route   GET /api/admin/counselor/:counselorId/follow-ups
 * @desc    Get counselor's follow-ups
 * @access  Admin only
 */
router.get("/counselor/:counselorId/follow-ups", getCounselorFollowUps);

/**
 * @route   GET /api/admin/counselor/:counselorId/follow-up-summary
 * @desc    Get counselor's follow-up summary (today, missed, upcoming)
 * @access  Admin only
 */
router.get("/counselor/:counselorId/follow-up-summary", getCounselorFollowUpSummary);

/**
 * @route   PATCH /api/admin/counselor/:counselorId/toggle-status
 * @desc    Toggle counselor active/inactive status
 * @access  Admin only
 */
router.patch("/counselor/:counselorId/toggle-status", toggleCounselorStatus);

export default router;


