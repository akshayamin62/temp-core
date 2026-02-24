import express from 'express';
import {
  getTestStatus,
  startSection,
  saveAnswer,
  submitSection,
  recordViolation,
  getTestReview,
} from '../controllers/ivyTestSession.controller';

const router = express.Router();

// GET  /api/ivy/test-session/status           — Get / create test session
router.get('/status', getTestStatus);

// GET  /api/ivy/test-session/review           — Full answer review (after test completed)
router.get('/review', getTestReview);

// POST /api/ivy/test-session/start-section    — Start a section (fetch random Qs)
router.post('/start-section', startSection);

// POST /api/ivy/test-session/save-answer      — Auto-save a single answer
router.post('/save-answer', saveAnswer);

// POST /api/ivy/test-session/submit-section   — Submit & grade a section
router.post('/submit-section', submitSection);

// POST /api/ivy/test-session/violation        — Record a violation
router.post('/violation', recordViolation);

export default router;
