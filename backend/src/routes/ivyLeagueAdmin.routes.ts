import express from 'express';
import {
  getIvyLeagueStats,
  getIvyCandidates,
  getIvyStudents,
  getStudentTestResult,
  getIvyExperts,
  convertCandidateToStudent,
  saveInterviewData,
  getInterviewData,
} from '../controllers/ivyLeagueAdmin.controller';
import { assignExpertToCandidate } from '../controllers/ivyExpertCandidate.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = express.Router();

const superAdminOnly = authorize(USER_ROLE.SUPER_ADMIN);
const superAdminOrExpert = authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.IVY_EXPERT]);
const readOnlyIvyAccess = authorize([
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.IVY_EXPERT,
  USER_ROLE.ADMIN,
  USER_ROLE.COUNSELOR,
  USER_ROLE.OPS,
  USER_ROLE.EDUPLAN_COACH,
  USER_ROLE.PARENT,
  USER_ROLE.REFERRER,
  USER_ROLE.STUDENT,
  USER_ROLE.ADVISOR,
]);

// GET /api/super-admin/ivy-league/stats           — Candidate/Student counts (SUPER_ADMIN only)
router.get('/stats', superAdminOnly, getIvyLeagueStats);

// GET /api/super-admin/ivy-league/candidates      — List ivy candidates (read-only for all staff roles)
router.get('/candidates', readOnlyIvyAccess, getIvyCandidates);

// GET /api/super-admin/ivy-league/students        — List ivy students (read-only for all staff roles)
router.get('/students', readOnlyIvyAccess, getIvyStudents);

// GET /api/super-admin/ivy-league/ivy-experts     — List ivy experts for dropdown (SUPER_ADMIN only)
router.get('/ivy-experts', superAdminOnly, getIvyExperts);

// GET /api/super-admin/ivy-league/test-result/:userId — Full test result (read-only for all staff roles)
router.get('/test-result/:userId', readOnlyIvyAccess, getStudentTestResult);

// GET /api/super-admin/ivy-league/interview/:userId — Get interview data (read-only for all staff roles)
router.get('/interview/:userId', readOnlyIvyAccess, getInterviewData);

// PUT /api/super-admin/ivy-league/interview/:userId — Save interview data (SUPER_ADMIN + IVY_EXPERT)
router.put('/interview/:userId', superAdminOrExpert, saveInterviewData);

// POST /api/super-admin/ivy-league/convert-to-student — SUPER_ADMIN only
router.post('/convert-to-student', superAdminOnly, convertCandidateToStudent);

// POST /api/super-admin/ivy-league/assign-expert — SUPER_ADMIN only
router.post('/assign-expert', superAdminOnly, assignExpertToCandidate);

export default router;
