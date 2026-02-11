"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTaskMessage = exports.getTaskConversation = exports.messageFileUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const TaskConversation_1 = __importDefault(require("../models/ivy/TaskConversation"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const IvyExpertSelectedSuggestion_1 = __importDefault(require("../models/ivy/IvyExpertSelectedSuggestion"));
const notification_service_1 = require("../services/notification.service");
const uploadDir_1 = require("../utils/uploadDir");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
    },
});
exports.messageFileUploadMiddleware = upload.single('file');
/**
 * Save uploaded file to disk
 */
const saveFile = async (file, subfolder) => {
    const uploadDir = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), subfolder);
    // Create directory if it doesn't exist
    (0, uploadDir_1.ensureDir)(uploadDir);
    // Sanitize filename to remove special characters
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${sanitizedOriginalName}`;
    const filePath = path_1.default.join(uploadDir, fileName);
    // Write file to disk
    fs_1.default.writeFileSync(filePath, file.buffer);
    // Calculate file size in readable format
    const bytes = file.size;
    let size = '';
    if (bytes < 1024) {
        size = bytes + ' B';
    }
    else if (bytes < 1024 * 1024) {
        size = (bytes / 1024).toFixed(2) + ' KB';
    }
    else {
        size = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return {
        url: `/uploads/${subfolder}/${fileName}`,
        size,
    };
};
/**
 * Get conversation for a specific task
 */
const getTaskConversation = async (req, res) => {
    try {
        const { selectionId, taskTitle, taskPage } = req.query;
        if (!selectionId || !taskTitle) {
            res.status(400).json({ success: false, message: 'selectionId and taskTitle are required' });
            return;
        }
        // Normalize taskPage: convert empty string, 'undefined', or undefined to actual undefined
        const normalizedTaskPage = taskPage && taskPage !== 'undefined' ? taskPage : undefined;
        // Find or create conversation
        let conversation = await TaskConversation_1.default.findOne({
            selectionId,
            taskTitle,
            ...(normalizedTaskPage && { taskPage: normalizedTaskPage }),
        });
        if (!conversation) {
            res.json({ success: true, data: { messages: [] } });
            return;
        }
        res.json({ success: true, data: conversation });
    }
    catch (error) {
        console.error('Error fetching task conversation:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTaskConversation = getTaskConversation;
/**
 * Add a message to task conversation
 */
const addTaskMessage = async (req, res) => {
    try {
        const { studentIvyServiceId, selectionId, taskTitle, taskPage, sender, senderName, text, messageType, } = req.body;
        if (!studentIvyServiceId || !selectionId || !taskTitle || !sender || !senderName) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId, selectionId, taskTitle, sender, and senderName are required',
            });
            return;
        }
        // Require either text or file attachment
        if (!text && !req.file) {
            res.status(400).json({
                success: false,
                message: 'Either text or file attachment is required',
            });
            return;
        }
        if (!['student', 'ivyExpert'].includes(sender)) {
            res.status(400).json({ success: false, message: 'sender must be "student" or "ivyExpert"' });
            return;
        }
        // Normalize taskPage: convert empty string, 'undefined', or undefined to actual undefined
        const normalizedTaskPage = taskPage && taskPage !== 'undefined' ? taskPage : undefined;
        // Find existing conversation using normalized taskPage
        const query = {
            selectionId,
            taskTitle,
        };
        if (normalizedTaskPage) {
            query.taskPage = normalizedTaskPage;
        }
        let conversation = await TaskConversation_1.default.findOne(query);
        if (!conversation) {
            conversation = new TaskConversation_1.default({
                studentIvyServiceId,
                selectionId,
                taskTitle,
                ...(normalizedTaskPage && { taskPage: normalizedTaskPage }),
                messages: [],
            });
        }
        // Handle file upload if present
        let attachment = undefined;
        if (req.file) {
            const fileData = await saveFile(req.file, 'task-conversations');
            attachment = {
                name: req.file.originalname,
                url: fileData.url,
                size: fileData.size,
            };
        }
        // Add message
        conversation.messages.push({
            sender,
            senderName,
            text: text || '',
            timestamp: new Date(),
            messageType: messageType || 'normal',
            attachment,
        });
        await conversation.save();
        // Create notification for the other party
        try {
            const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
            const selection = await IvyExpertSelectedSuggestion_1.default.findById(selectionId);
            if (service && selection) {
                // Determine recipient based on sender
                const isFromStudent = sender === 'student';
                const recipientId = isFromStudent ? service.activeIvyExpertId : service.studentId;
                const recipientRole = isFromStudent ? 'ivyExpert' : 'student';
                if (recipientId) {
                    await (0, notification_service_1.createNotification)({
                        studentIvyServiceId,
                        userId: recipientId,
                        userRole: recipientRole,
                        pointerNumber: selection.pointerNo,
                        notificationType: 'new_message',
                        referenceId: selectionId,
                        taskTitle: taskTitle || undefined,
                        taskPage: taskPage || undefined,
                    });
                }
            }
        }
        catch (notificationError) {
            console.error('Error creating notification for message:', notificationError);
            // Don't fail the request if notification creation fails
        }
        res.json({ success: true, data: conversation });
    }
    catch (error) {
        console.error('Error adding task message:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.addTaskMessage = addTaskMessage;
//# sourceMappingURL=taskConversation.controller.js.map