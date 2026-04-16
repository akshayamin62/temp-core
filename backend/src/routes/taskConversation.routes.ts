import express from 'express';
import { getTaskConversation, addTaskMessage, messageFileUploadMiddleware } from '../controllers/taskConversation.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import { checkAdvisorStudentAccess } from '../middleware/advisorStudentOwnership';

const router = express.Router();

router.get('/conversation', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.PARENT, USER_ROLE.ADVISOR]), checkAdvisorStudentAccess, getTaskConversation);
router.post('/conversation/message', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), messageFileUploadMiddleware, addTaskMessage);

export default router;
