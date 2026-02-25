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

const router = express.Router();

// GET /api/super-admin/ivy-league/stats           — Candidate/Student counts
router.get('/stats', getIvyLeagueStats);

// GET /api/super-admin/ivy-league/candidates      — List ivy candidates
router.get('/candidates', getIvyCandidates);

// GET /api/super-admin/ivy-league/students        — List ivy students (assigned)
router.get('/students', getIvyStudents);

// GET /api/super-admin/ivy-league/ivy-experts     — List ivy experts for dropdown
router.get('/ivy-experts', getIvyExperts);

// GET /api/super-admin/ivy-league/test-result/:userId — Full test result for a student
router.get('/test-result/:userId', getStudentTestResult);

// GET /api/super-admin/ivy-league/interview/:userId — Get interview data
router.get('/interview/:userId', getInterviewData);

// PUT /api/super-admin/ivy-league/interview/:userId — Save interview data
router.put('/interview/:userId', saveInterviewData);

// POST /api/super-admin/ivy-league/convert-to-student — Convert candidate to student
router.post('/convert-to-student', convertCandidateToStudent);

export default router;
