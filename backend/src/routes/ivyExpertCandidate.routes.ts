import express from 'express';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  getMyIvyCandidates,
  getMyIvyStudents,
  ivyExpertConvertToStudent,
  getTestResultForExpert,
  saveInterviewForExpert,
  getInterviewForExpert,
} from '../controllers/ivyExpertCandidate.controller';

const router = express.Router();

// GET /api/ivy/ivy-expert-candidates/my-candidates — Ivy Expert's assigned candidates
router.get('/my-candidates', authorize(USER_ROLE.IVY_EXPERT), getMyIvyCandidates);

// GET /api/ivy/ivy-expert-candidates/my-ivy-students — Ivy Expert's converted students
router.get('/my-ivy-students', authorize(USER_ROLE.IVY_EXPERT), getMyIvyStudents);

// POST /api/ivy/ivy-expert-candidates/convert-to-student — Convert candidate to student
router.post('/convert-to-student', authorize(USER_ROLE.IVY_EXPERT), ivyExpertConvertToStudent);

// GET /api/ivy/ivy-expert-candidates/test-result/:userId — Get test result
router.get('/test-result/:userId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), getTestResultForExpert);

// GET /api/ivy/ivy-expert-candidates/interview/:userId — Get interview data
router.get('/interview/:userId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), getInterviewForExpert);

// PUT /api/ivy/ivy-expert-candidates/interview/:userId — Save interview data
router.put('/interview/:userId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), saveInterviewForExpert);

export default router;
