import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service';

export const getUnreadCounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const counts = await notificationService.getUnreadCountsByPointer(userId as string);
    const totalCount = await notificationService.getTotalUnreadCount(userId as string);

    return res.json({
      success: true,
      data: {
        byPointer: counts,
        total: totalCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get unread counts',
    });
  }
};

export const markPointerAsRead = async (req: Request, res: Response) => {
  try {
    const { userId, pointerNumber } = req.body;

    if (!userId || !pointerNumber) {
      return res.status(400).json({
        success: false,
        message: 'User ID and pointer number are required',
      });
    }

    await notificationService.markPointerAsRead(userId, parseInt(pointerNumber));

    return res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark as read',
    });
  }
};

export const getNotificationsByPointer = async (req: Request, res: Response) => {
  try {
    const { userId, pointerNumber } = req.query;

    if (!userId || !pointerNumber) {
      return res.status(400).json({
        success: false,
        message: 'User ID and pointer number are required',
      });
    }

    const notifications = await notificationService.getNotificationsByPointer(
      userId as string,
      parseInt(pointerNumber as string)
    );

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get notifications',
    });
  }
};

export const getTaskUnreadCount = async (req: Request, res: Response) => {
  try {
    const { userId, referenceId, taskTitle, taskPage } = req.query;

    if (!userId || !referenceId || !taskTitle || !taskPage) {
      return res.status(400).json({
        success: false,
        message: 'userId, referenceId, taskTitle, and taskPage are required',
      });
    }

    const count = await notificationService.getTaskUnreadCount(
      userId as string,
      referenceId as string,
      taskTitle as string,
      taskPage as string
    );

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get task unread count',
    });
  }
};

export const markTaskAsRead = async (req: Request, res: Response) => {
  try {
    const { userId, referenceId, taskTitle, taskPage } = req.body;

    if (!userId || !referenceId || !taskTitle || !taskPage) {
      return res.status(400).json({
        success: false,
        message: 'userId, referenceId, taskTitle, and taskPage are required',
      });
    }

    await notificationService.markTaskAsRead(
      userId,
      referenceId,
      taskTitle,
      taskPage
    );

    return res.json({
      success: true,
      message: 'Task notifications marked as read',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark task notifications as read',
    });
  }
};

export const getBulkTaskUnreadCounts = async (req: Request, res: Response) => {
  try {
    const { userId, tasks } = req.body;

    if (!userId || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        message: 'userId and tasks array are required',
      });
    }

    const counts = await notificationService.getBulkTaskUnreadCounts(userId, tasks);

    return res.json({
      success: true,
      data: counts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get bulk task unread counts',
    });
  }
};
