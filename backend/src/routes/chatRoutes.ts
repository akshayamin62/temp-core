import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import { upload } from '../middleware/upload';
import {
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  getMyChatsList,
  uploadChatDocument,
  saveChatDocumentToExtra,
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

// Upload document in chat (open chat)
router.post('/program/:programId/upload-document', authorize([USER_ROLE.STUDENT, USER_ROLE.COUNSELOR, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN]), upload.single('file'), uploadChatDocument);

// Save chat document to Extra Documents (OPS / SUPER_ADMIN only)
router.post('/messages/:messageId/save-to-extra', authorize([USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN]), saveChatDocumentToExtra);

export default router;

