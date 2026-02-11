import { Router } from 'express';
import {
  evaluateActivityHandler,
  getStudentActivitiesHandler,
  proofUploadMiddleware,
  ivyExpertDocsMiddleware,
  selectActivitiesHandler,
  uploadProofHandler,
  uploadIvyExpertDocumentsHandler,
  updateDocumentTaskStatusHandler,
  updateWeightagesHandler,
  getPointerActivityScoreHandler,
  setDeadlineHandler,
} from '../controllers/pointerActivity.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Ivy Expert selects activities
router.post('/select', authorize(USER_ROLE.IVY_EXPERT), selectActivitiesHandler);

// Student / Ivy Expert fetch activities
router.get('/student/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStudentActivitiesHandler);
router.get('/student', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStudentActivitiesHandler);

// Student uploads proof files
router.post('/proof/upload', authorize(USER_ROLE.STUDENT), proofUploadMiddleware, uploadProofHandler);

// Ivy Expert uploads documents for activities
router.post('/ivy-expert/documents', authorize(USER_ROLE.IVY_EXPERT), ivyExpertDocsMiddleware, uploadIvyExpertDocumentsHandler);

// Ivy Expert updates task completion status
router.post('/ivy-expert/task/status', authorize(USER_ROLE.IVY_EXPERT), updateDocumentTaskStatusHandler);

// Ivy Expert updates weightages for activities
router.put('/weightages', authorize(USER_ROLE.IVY_EXPERT), updateWeightagesHandler);

// Ivy Expert evaluates submission
router.post('/evaluate', authorize(USER_ROLE.IVY_EXPERT), evaluateActivityHandler);

// Ivy Expert sets deadline for an activity
router.post('/deadline', authorize(USER_ROLE.IVY_EXPERT), setDeadlineHandler);

// Get pointer activity score
router.get('/score/:studentIvyServiceId/:pointerNo', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointerActivityScoreHandler);
router.get('/score', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointerActivityScoreHandler);

export default router;


