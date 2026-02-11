import PointerNotification from '../models/ivy/PointerNotification';
import { Types } from 'mongoose';

interface CreateNotificationParams {
  studentIvyServiceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  userRole: 'student' | 'ivyExpert';
  pointerNumber: number;
  notificationType: string;
  referenceId?: string | Types.ObjectId;
  taskTitle?: string;
  taskPage?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = new PointerNotification({
      studentIvyServiceId: params.studentIvyServiceId,
      userId: params.userId,
      userRole: params.userRole,
      pointerNumber: params.pointerNumber,
      notificationType: params.notificationType,
      referenceId: params.referenceId,
      taskTitle: params.taskTitle,
      taskPage: params.taskPage,
      isRead: false,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUnreadCountsByPointer = async (userId: string | Types.ObjectId) => {
  try {
    const counts = await PointerNotification.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId as string),
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$pointerNumber',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to object format: { 1: 5, 2: 3, ... }
    const countsObj: { [key: number]: number } = {};
    counts.forEach((item) => {
      countsObj[item._id] = item.count;
    });

    return countsObj;
  } catch (error) {
    console.error('Error getting unread counts:', error);
    throw error;
  }
};

export const getTotalUnreadCount = async (userId: string | Types.ObjectId) => {
  try {
    const count = await PointerNotification.countDocuments({
      userId: new Types.ObjectId(userId as string),
      isRead: false,
    });
    return count;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    throw error;
  }
};

export const markAsRead = async (notificationIds: string[] | Types.ObjectId[]) => {
  try {
    await PointerNotification.updateMany(
      { _id: { $in: notificationIds.map(id => new Types.ObjectId(id as string)) } },
      { $set: { isRead: true } }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

export const markPointerAsRead = async (userId: string | Types.ObjectId, pointerNumber: number) => {
  try {
    await PointerNotification.updateMany(
      {
        userId: new Types.ObjectId(userId as string),
        pointerNumber,
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  } catch (error) {
    console.error('Error marking pointer notifications as read:', error);
    throw error;
  }
};

export const getNotificationsByPointer = async (
  userId: string | Types.ObjectId,
  pointerNumber: number,
  limit: number = 50
) => {
  try {
    const notifications = await PointerNotification.find({
      userId: new Types.ObjectId(userId as string),
      pointerNumber,
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return notifications;
  } catch (error) {
    console.error('Error getting notifications by pointer:', error);
    throw error;
  }
};

// Get unread count for a specific task
export const getTaskUnreadCount = async (
  userId: string | Types.ObjectId,
  referenceId: string | Types.ObjectId,
  taskTitle: string,
  taskPage: string
) => {
  try {
    const count = await PointerNotification.countDocuments({
      userId: new Types.ObjectId(userId as string),
      referenceId: new Types.ObjectId(referenceId as string),
      taskTitle,
      taskPage,
      isRead: false,
    });
    return count;
  } catch (error) {
    console.error('Error getting task unread count:', error);
    throw error;
  }
};

// Get unread counts for multiple tasks in bulk (optimized)
export const getBulkTaskUnreadCounts = async (
  userId: string | Types.ObjectId,
  tasks: Array<{ referenceId: string; taskTitle: string; taskPage: string }>
) => {
  try {
    if (!tasks || tasks.length === 0) return [];

    const userIdObj = new Types.ObjectId(userId as string);

    // Use aggregation to get all counts in one query
    const results = await PointerNotification.aggregate([
      {
        $match: {
          userId: userIdObj,
          isRead: false,
          $or: tasks.map(task => ({
            referenceId: new Types.ObjectId(task.referenceId),
            taskTitle: task.taskTitle,
            taskPage: task.taskPage,
          })),
        },
      },
      {
        $group: {
          _id: {
            referenceId: '$referenceId',
            taskTitle: '$taskTitle',
            taskPage: '$taskPage',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to array format matching input tasks
    return tasks.map(task => {
      const match = results.find(r => 
        r._id.referenceId.toString() === task.referenceId &&
        r._id.taskTitle === task.taskTitle &&
        r._id.taskPage === task.taskPage
      );
      return {
        referenceId: task.referenceId,
        taskTitle: task.taskTitle,
        taskPage: task.taskPage,
        count: match ? match.count : 0,
      };
    });
  } catch (error) {
    console.error('Error getting bulk task unread counts:', error);
    throw error;
  }
};

// Mark task-level notifications as read
export const markTaskAsRead = async (
  userId: string | Types.ObjectId,
  referenceId: string | Types.ObjectId,
  taskTitle: string,
  taskPage: string
) => {
  try {
    await PointerNotification.updateMany(
      {
        userId: new Types.ObjectId(userId as string),
        referenceId: new Types.ObjectId(referenceId as string),
        taskTitle,
        taskPage,
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  } catch (error) {
    console.error('Error marking task notifications as read:', error);
    throw error;
  }
};
