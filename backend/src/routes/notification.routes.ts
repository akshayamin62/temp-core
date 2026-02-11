import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Get unread notification counts
router.get('/unread-counts', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.getUnreadCounts);

// Get notifications by pointer
router.get('/by-pointer', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.getNotificationsByPointer);

// Mark pointer notifications as read
router.post('/mark-read', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.markPointerAsRead);

// Get task-level unread count
router.get('/task-count', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.getTaskUnreadCount);

// Get bulk task-level unread counts (optimized for multiple tasks)
router.post('/task-counts-bulk', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.getBulkTaskUnreadCounts);

// Mark task-level notifications as read
router.post('/task-mark-read', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT]), notificationController.markTaskAsRead);

export default router;
