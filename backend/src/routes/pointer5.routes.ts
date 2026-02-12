// Pointer 5: Authentic & Reflective Storytelling Routes

import { Router } from 'express';
import {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
    getTasksHandler,
    submitResponseHandler,
    evaluateSubmissionHandler,
    getStatusHandler,
    getScoreHandler,
    uploadAttachmentsMiddleware,
} from '../controllers/pointer5.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Task Routes (Ivy Expert)
router.post('/task', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), uploadAttachmentsMiddleware, createTaskHandler);
router.put('/task', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), uploadAttachmentsMiddleware, updateTaskHandler);
router.delete('/task/:taskId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), deleteTaskHandler);
router.get('/tasks/:studentIvyServiceId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getTasksHandler);
router.get('/tasks', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getTasksHandler);

// Submission Routes (Student)
router.post('/submit', authorize(USER_ROLE.STUDENT), submitResponseHandler);

// Evaluation Routes (Ivy Expert)
router.post('/evaluate', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), evaluateSubmissionHandler);

// Status Routes (All)
router.get('/status/:studentIvyServiceId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStatusHandler);
router.get('/status', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getStatusHandler);

// Score Route
router.get('/score/:studentIvyServiceId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getScoreHandler);
router.get('/score', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getScoreHandler);

export default router;
