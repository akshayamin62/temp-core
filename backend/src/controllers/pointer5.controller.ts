import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveIvyExpertId } from '../utils/resolveRole';
import { USER_ROLE } from '../types/roles';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as pointer5Service from '../services/pointer5.service';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// File upload configuration
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadPath = path.join(getUploadBaseDir(), 'pointer5', 'attachments');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});

export const uploadAttachmentsMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    },
}).array('attachments', 5);

// Create Task
export const createTaskHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const { studentIvyServiceId, taskDescription, wordLimit, ivyExpertId: bodyIvyExpertId } = req.body;
        const authReq = req as AuthRequest;
        let ivyExpertId: string;
        if (authReq.user!.role === USER_ROLE.SUPER_ADMIN) {
            ivyExpertId = bodyIvyExpertId || authReq.user!.userId;
        } else {
            ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);
        }

        if (!studentIvyServiceId || !taskDescription) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: studentIvyServiceId, taskDescription',
            })
            return;
        }

        const attachments = req.files
            ? (req.files as Express.Multer.File[]).map((file) => ({
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
    } catch (error: any) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create task',
        });
    }
};

// Update Task
export const updateTaskHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const { taskId, taskDescription, wordLimit } = req.body;

        if (!taskId) {
            res.status(400).json({
                success: false,
                message: 'Task ID is required',
            })
            return;
        }

        const attachments = req.files && (req.files as Express.Multer.File[]).length > 0
            ? (req.files as Express.Multer.File[]).map((file) => ({
                  fileName: file.originalname,
                  fileUrl: `/uploads/pointer5/attachments/${file.filename}`,
              }))
            : undefined;

        const updateData: any = {};
        if (taskDescription) updateData.taskDescription = taskDescription;
        if (wordLimit) updateData.wordLimit = parseInt(wordLimit);
        if (attachments) updateData.attachments = attachments;

        const task = await pointer5Service.updateTask(taskId, updateData);

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task,
        });
    } catch (error: any) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update task',
        });
    }
};

// Delete Task
export const deleteTaskHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const taskId = String(req.params.taskId || '');

        if (!taskId) {
            res.status(400).json({
                success: false,
                message: 'Task ID is required',
            })
            return;
        }

        await pointer5Service.deleteTask(taskId);

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete task',
        });
    }
};

// Get Tasks
export const getTasksHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');

        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            })
            return;
        }

        const tasks = await pointer5Service.getTasksByStudentServiceId(studentIvyServiceId);

        res.status(200).json({
            success: true,
            data: tasks,
        });
    } catch (error: any) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tasks',
        });
    }
};

// Submit Response
export const submitResponseHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const { taskId, studentIvyServiceId, studentResponse, wordsLearned } = req.body;

        if (!taskId || !studentIvyServiceId || !studentResponse) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: taskId, studentIvyServiceId, studentResponse',
            })
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
    } catch (error: any) {
        console.error('Error submitting response:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit response',
        });
    }
};

// Evaluate Submission
export const evaluateSubmissionHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const { submissionId, taskId, studentIvyServiceId, score, feedback, ivyExpertId: bodyIvyExpertId } = req.body;
        const authReq = req as AuthRequest;
        let ivyExpertId: string;
        if (authReq.user!.role === USER_ROLE.SUPER_ADMIN) {
            ivyExpertId = bodyIvyExpertId || authReq.user!.userId;
        } else {
            ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);
        }

        if (!submissionId || !taskId || !studentIvyServiceId || score === undefined) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            })
            return;
        }

        const scoreNum = parseFloat(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
            res.status(400).json({
                success: false,
                message: 'Score must be between 0 and 10',
            })
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
    } catch (error: any) {
        console.error('Error evaluating submission:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to evaluate submission',
        });
    }
};

// Get Complete Status
export const getStatusHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');

        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            })
            return;
        }

        const status = await pointer5Service.getCompleteStatus(studentIvyServiceId);

        res.status(200).json({
            success: true,
            data: status,
        });
    } catch (error: any) {
        console.error('Error fetching status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch status',
        });
    }
};

// Get Pointer 5 Score
export const getScoreHandler = async (req: Request, res: Response): Promise<any> => {
    try {
        const studentIvyServiceId = String(req.params.studentIvyServiceId || req.query.studentIvyServiceId || '');

        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'Student Service Registration ID is required',
            })
            return;
        }

        const score = await pointer5Service.calculatePointer5Score(studentIvyServiceId);

        res.status(200).json({
            success: true,
            data: { score },
        });
    } catch (error: any) {
        console.error('Error calculating score:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate score',
        });
    }
};
