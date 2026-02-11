"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBulkTaskUnreadCounts = exports.markTaskAsRead = exports.getTaskUnreadCount = exports.getNotificationsByPointer = exports.markPointerAsRead = exports.getUnreadCounts = void 0;
const notificationService = __importStar(require("../services/notification.service"));
const getUnreadCounts = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
            });
        }
        const counts = await notificationService.getUnreadCountsByPointer(userId);
        const totalCount = await notificationService.getTotalUnreadCount(userId);
        return res.json({
            success: true,
            data: {
                byPointer: counts,
                total: totalCount,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get unread counts',
        });
    }
};
exports.getUnreadCounts = getUnreadCounts;
const markPointerAsRead = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark as read',
        });
    }
};
exports.markPointerAsRead = markPointerAsRead;
const getNotificationsByPointer = async (req, res) => {
    try {
        const { userId, pointerNumber } = req.query;
        if (!userId || !pointerNumber) {
            return res.status(400).json({
                success: false,
                message: 'User ID and pointer number are required',
            });
        }
        const notifications = await notificationService.getNotificationsByPointer(userId, parseInt(pointerNumber));
        return res.json({
            success: true,
            data: notifications,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get notifications',
        });
    }
};
exports.getNotificationsByPointer = getNotificationsByPointer;
const getTaskUnreadCount = async (req, res) => {
    try {
        const { userId, referenceId, taskTitle, taskPage } = req.query;
        if (!userId || !referenceId || !taskTitle || !taskPage) {
            return res.status(400).json({
                success: false,
                message: 'userId, referenceId, taskTitle, and taskPage are required',
            });
        }
        const count = await notificationService.getTaskUnreadCount(userId, referenceId, taskTitle, taskPage);
        return res.json({
            success: true,
            data: { count },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get task unread count',
        });
    }
};
exports.getTaskUnreadCount = getTaskUnreadCount;
const markTaskAsRead = async (req, res) => {
    try {
        const { userId, referenceId, taskTitle, taskPage } = req.body;
        if (!userId || !referenceId || !taskTitle || !taskPage) {
            return res.status(400).json({
                success: false,
                message: 'userId, referenceId, taskTitle, and taskPage are required',
            });
        }
        await notificationService.markTaskAsRead(userId, referenceId, taskTitle, taskPage);
        return res.json({
            success: true,
            message: 'Task notifications marked as read',
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark task notifications as read',
        });
    }
};
exports.markTaskAsRead = markTaskAsRead;
const getBulkTaskUnreadCounts = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get bulk task unread counts',
        });
    }
};
exports.getBulkTaskUnreadCounts = getBulkTaskUnreadCounts;
//# sourceMappingURL=notification.controller.js.map