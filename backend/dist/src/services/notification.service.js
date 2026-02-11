"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markTaskAsRead = exports.getBulkTaskUnreadCounts = exports.getTaskUnreadCount = exports.getNotificationsByPointer = exports.markPointerAsRead = exports.markAsRead = exports.getTotalUnreadCount = exports.getUnreadCountsByPointer = exports.createNotification = void 0;
const PointerNotification_1 = __importDefault(require("../models/ivy/PointerNotification"));
const mongoose_1 = require("mongoose");
const createNotification = async (params) => {
    try {
        const notification = new PointerNotification_1.default({
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
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
exports.createNotification = createNotification;
const getUnreadCountsByPointer = async (userId) => {
    try {
        const counts = await PointerNotification_1.default.aggregate([
            {
                $match: {
                    userId: new mongoose_1.Types.ObjectId(userId),
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
        const countsObj = {};
        counts.forEach((item) => {
            countsObj[item._id] = item.count;
        });
        return countsObj;
    }
    catch (error) {
        console.error('Error getting unread counts:', error);
        throw error;
    }
};
exports.getUnreadCountsByPointer = getUnreadCountsByPointer;
const getTotalUnreadCount = async (userId) => {
    try {
        const count = await PointerNotification_1.default.countDocuments({
            userId: new mongoose_1.Types.ObjectId(userId),
            isRead: false,
        });
        return count;
    }
    catch (error) {
        console.error('Error getting total unread count:', error);
        throw error;
    }
};
exports.getTotalUnreadCount = getTotalUnreadCount;
const markAsRead = async (notificationIds) => {
    try {
        await PointerNotification_1.default.updateMany({ _id: { $in: notificationIds.map(id => new mongoose_1.Types.ObjectId(id)) } }, { $set: { isRead: true } });
    }
    catch (error) {
        console.error('Error marking notifications as read:', error);
        throw error;
    }
};
exports.markAsRead = markAsRead;
const markPointerAsRead = async (userId, pointerNumber) => {
    try {
        await PointerNotification_1.default.updateMany({
            userId: new mongoose_1.Types.ObjectId(userId),
            pointerNumber,
            isRead: false,
        }, { $set: { isRead: true } });
    }
    catch (error) {
        console.error('Error marking pointer notifications as read:', error);
        throw error;
    }
};
exports.markPointerAsRead = markPointerAsRead;
const getNotificationsByPointer = async (userId, pointerNumber, limit = 50) => {
    try {
        const notifications = await PointerNotification_1.default.find({
            userId: new mongoose_1.Types.ObjectId(userId),
            pointerNumber,
        })
            .sort({ createdAt: -1 })
            .limit(limit);
        return notifications;
    }
    catch (error) {
        console.error('Error getting notifications by pointer:', error);
        throw error;
    }
};
exports.getNotificationsByPointer = getNotificationsByPointer;
// Get unread count for a specific task
const getTaskUnreadCount = async (userId, referenceId, taskTitle, taskPage) => {
    try {
        const count = await PointerNotification_1.default.countDocuments({
            userId: new mongoose_1.Types.ObjectId(userId),
            referenceId: new mongoose_1.Types.ObjectId(referenceId),
            taskTitle,
            taskPage,
            isRead: false,
        });
        return count;
    }
    catch (error) {
        console.error('Error getting task unread count:', error);
        throw error;
    }
};
exports.getTaskUnreadCount = getTaskUnreadCount;
// Get unread counts for multiple tasks in bulk (optimized)
const getBulkTaskUnreadCounts = async (userId, tasks) => {
    try {
        if (!tasks || tasks.length === 0)
            return [];
        const userIdObj = new mongoose_1.Types.ObjectId(userId);
        // Use aggregation to get all counts in one query
        const results = await PointerNotification_1.default.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    isRead: false,
                    $or: tasks.map(task => ({
                        referenceId: new mongoose_1.Types.ObjectId(task.referenceId),
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
            const match = results.find(r => r._id.referenceId.toString() === task.referenceId &&
                r._id.taskTitle === task.taskTitle &&
                r._id.taskPage === task.taskPage);
            return {
                referenceId: task.referenceId,
                taskTitle: task.taskTitle,
                taskPage: task.taskPage,
                count: match ? match.count : 0,
            };
        });
    }
    catch (error) {
        console.error('Error getting bulk task unread counts:', error);
        throw error;
    }
};
exports.getBulkTaskUnreadCounts = getBulkTaskUnreadCounts;
// Mark task-level notifications as read
const markTaskAsRead = async (userId, referenceId, taskTitle, taskPage) => {
    try {
        await PointerNotification_1.default.updateMany({
            userId: new mongoose_1.Types.ObjectId(userId),
            referenceId: new mongoose_1.Types.ObjectId(referenceId),
            taskTitle,
            taskPage,
            isRead: false,
        }, { $set: { isRead: true } });
    }
    catch (error) {
        console.error('Error marking task notifications as read:', error);
        throw error;
    }
};
exports.markTaskAsRead = markTaskAsRead;
//# sourceMappingURL=notification.service.js.map