import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  getMyChatsList,
} from '../controllers/chatController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all chats for current user
router.get('/my-chats', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN]), getMyChatsList);

// Get or create chat for a program
router.get('/program/:programId/chat', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN]), getOrCreateChat);

// Get all messages for a program
router.get('/program/:programId/messages', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN]), getChatMessages);

// Send a message
router.post('/program/:programId/messages', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN]), sendMessage);

export default router;

