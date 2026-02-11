import express from 'express';
import { getTaskConversation, addTaskMessage, messageFileUploadMiddleware } from '../controllers/taskConversation.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = express.Router();

router.get('/conversation', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), getTaskConversation);
router.post('/conversation/message', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), messageFileUploadMiddleware, addTaskMessage);

export default router;
