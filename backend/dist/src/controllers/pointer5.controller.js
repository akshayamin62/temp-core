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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScoreHandler = exports.getStatusHandler = exports.evaluateSubmissionHandler = exports.submitResponseHandler = exports.getTasksHandler = exports.deleteTaskHandler = exports.updateTaskHandler = exports.createTaskHandler = exports.uploadAttachmentsMiddleware = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const pointer5Service = __importStar(require("../services/pointer5.service"));
const uploadDir_1 = require("../utils/uploadDir");
// File upload configuration
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadPath = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'pointer5', 'attachments');
        (0, uploadDir_1.ensureDir)(uploadPath);
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
exports.uploadAttachmentsMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    },
}).array('attachments', 5);
// Create Task
const createTaskHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, taskDescription, wordLimit } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentIvyServiceId || !taskDescription) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: studentIvyServiceId, taskDescription',
            });
            return;
        }
        const attachments = req.files
            ? req.files.map((file) => ({
                fileName: file.originalname,
                fileUrl: `/uploads/pointer5/attachments/${file.filename}`,
            }))
            : [];
        const task = await pointer5Service.createTask({
            studentIvyServiceId,
            ivyExpertId,
            taskDescription,
            wordLimit: parseInt(wordLimit) || 500,
            attachments,
        });
        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task,
        });
    }
    catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create task',
        });
    }
};
exports.createTaskHandler = createTaskHandler;
// Update Task
const updateTaskHandler = async (req, res) => {
    try {
        const { taskId, taskDescription, wordLimit } = req.body;
        if (!taskId) {
            res.status(400).json({
                success: false,
                message: 'Task ID is required',
            });
            return;
        }
        const attachments = req.files && req.files.length > 0
            ? req.files.map((file) => ({
                fileName: file.originalname,
                fileUrl: `/uploads/pointer5/attachments/${file.filename}`,
            }))
            : undefined;
        const updateData = {};
        if (taskDescription)
            updateData.taskDescription = taskDescription;
        if (wordLimit)
            updateData.wordLimit = parseInt(wordLimit);
        if (attachments)
            updateData.attachments = attachments;
        const task = await pointer5Service.updateTask(taskId, updateData);
        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task,
        });
    }
    catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update task',
        });
    }
};
exports.updateTaskHandler = updateTaskHandler;
// Delete Task
const deleteTaskHandler = async (req, res) => {
    try {
        const taskId = String(req.params.taskId || '');
        if (!taskId) {
            res.status(400).json({
                success: false,
                message: 'Task ID is required',
            });
            return;
        }
        await pointer5Service.deleteTask(taskId);
        res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete task',
        });
    }
};
exports.deleteTaskHandler = deleteTaskHandler;
// Get Tasks
const getTasksHandler = async (req, res) => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            });
            return;
        }
        const tasks = await pointer5Service.getTasksByStudentServiceId(studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: tasks,
        });
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tasks',
        });
    }
};
exports.getTasksHandler = getTasksHandler;
// Submit Response
const submitResponseHandler = async (req, res) => {
    try {
        const { taskId, studentIvyServiceId, studentResponse, wordsLearned } = req.body;
        if (!taskId || !studentIvyServiceId || !studentResponse) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: taskId, studentIvyServiceId, studentResponse',
            });
            return;
        }
        const submission = await pointer5Service.createOrUpdateSubmission({
            taskId,
            studentIvyServiceId,
            studentResponse,
            wordsLearned: wordsLearned || '',
        });
        res.status(200).json({
            success: true,
            message: 'Submission saved successfully',
            data: submission,
        });
    }
    catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit response',
        });
    }
};
exports.submitResponseHandler = submitResponseHandler;
// Evaluate Submission
const evaluateSubmissionHandler = async (req, res) => {
    try {
        const { submissionId, taskId, studentIvyServiceId, score, feedback } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!submissionId || !taskId || !studentIvyServiceId || score === undefined) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
            return;
        }
        const scoreNum = parseFloat(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
            res.status(400).json({
                success: false,
                message: 'Score must be between 0 and 10',
            });
            return;
        }
        const evaluation = await pointer5Service.createOrUpdateEvaluation({
            submissionId,
            taskId,
            studentIvyServiceId,
            ivyExpertId,
            score: scoreNum,
            feedback: feedback || '',
        });
        res.status(200).json({
            success: true,
            message: 'Evaluation saved successfully',
            data: evaluation,
        });
    }
    catch (error) {
        console.error('Error evaluating submission:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to evaluate submission',
        });
    }
};
exports.evaluateSubmissionHandler = evaluateSubmissionHandler;
// Get Complete Status
const getStatusHandler = async (req, res) => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            });
            return;
        }
        const status = await pointer5Service.getCompleteStatus(studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch status',
        });
    }
};
exports.getStatusHandler = getStatusHandler;
// Get Pointer 5 Score
const getScoreHandler = async (req, res) => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            });
            return;
        }
        const score = await pointer5Service.calculatePointer5Score(studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: { score },
        });
    }
    catch (error) {
        console.error('Error calculating score:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate score',
        });
    }
};
exports.getScoreHandler = getScoreHandler;
//# sourceMappingURL=pointer5.controller.js.map