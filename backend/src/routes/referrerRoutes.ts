import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getReferrerDashboardStats,
  getReferralLink,
  getReferrerLeads,
  getReferrerLeadDetail,
  getReferrerStudents,
  getReferrerStudentDetail,
  getReferrerStudentByLeadId,
  getReferrerStudentFormAnswers,
} from "../controllers/referrerController";

const router = Router();

// All routes require authentication and referrer role
router.use(authenticate);
router.use(authorize([USER_ROLE.REFERRER]));

/**
 * @route   GET /api/referrer/dashboard-stats
 * @desc    Get referrer dashboard stats (total leads, converted, students, slug)
 * @access  Referrer only
 */
router.get("/dashboard-stats", getReferrerDashboardStats);

/**
 * @route   GET /api/referrer/referral-link
 * @desc    Get referrer's referral slug
 * @access  Referrer only
 */
router.get("/referral-link", getReferralLink);

/**
 * @route   GET /api/referrer/leads
 * @desc    Get all leads referred by this referrer
 * @access  Referrer only
 */
router.get("/leads", getReferrerLeads);

/**
 * @route   GET /api/referrer/leads/:leadId
 * @desc    Get single lead detail
 * @access  Referrer only
 */
router.get("/leads/:leadId", getReferrerLeadDetail);

/**
 * @route   GET /api/referrer/students
 * @desc    Get students converted from referrer's leads
 * @access  Referrer only
 */
router.get("/students", getReferrerStudents);

/**
 * @route   GET /api/referrer/students/:studentId
 * @desc    Get single student detail (read-only)
 * @access  Referrer only
 */
router.get("/students/:studentId", getReferrerStudentDetail);

/**
 * @route   GET /api/referrer/students/:studentId/registrations/:registrationId/answers
 * @desc    Get student form answers for a registration (read-only)
 * @access  Referrer only
 */
router.get("/students/:studentId/registrations/:registrationId/answers", getReferrerStudentFormAnswers);

/**
 * @route   GET /api/referrer/leads/:leadId/student
 * @desc    Get student by lead ID (for converted leads)
 * @access  Referrer only
 */
router.get("/leads/:leadId/student", getReferrerStudentByLeadId);

export default router;
