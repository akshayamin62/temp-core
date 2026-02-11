import { Router } from 'express';
import {
  selectActivitiesHandler,
  getStudentActivitiesHandler,
  uploadProofHandler,
  uploadProofMiddleware,
  evaluateActivityHandler,
  updateWeightagesHandler,
} from '../controllers/pointer234Activity.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Health check route
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Pointer 2/3/4 Activity routes are working' });
});

// POST /pointer/activity/select - Ivy Expert selects activities
router.post('/activity/select', authorize(USER_ROLE.IVY_EXPERT), selectActivitiesHandler);

// GET /pointer/activity/student/:studentId - Get student activities
router.get('/activity/student/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStudentActivitiesHandler);

// PUT /pointer/activity/weightages - Ivy Expert updates weightages
router.put('/activity/weightages', authorize(USER_ROLE.IVY_EXPERT), updateWeightagesHandler);

// POST /pointer/activity/proof/upload - Student uploads proof
router.post('/activity/proof/upload', authorize(USER_ROLE.STUDENT), uploadProofMiddleware, uploadProofHandler);

// POST /pointer/activity/evaluate - Ivy Expert evaluates activity
router.post('/activity/evaluate', authorize(USER_ROLE.IVY_EXPERT), evaluateActivityHandler);

export default router;

