"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeightagesHandler = exports.evaluateActivityHandler = exports.uploadProofHandler = exports.uploadProofMiddleware = exports.getStudentActivitiesHandler = exports.selectActivitiesHandler = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const pointer234Activity_service_1 = require("../services/pointer234Activity.service");
const multer_1 = __importDefault(require("multer"));
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
    },
});
/**
 * POST /pointer/activity/select
 * Ivy Expert selects activities
 */
const selectActivitiesHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, agentSuggestionIds, pointerNo, weightages } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId is required',
            });
            return;
        }
        if (!agentSuggestionIds || !Array.isArray(agentSuggestionIds) || agentSuggestionIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'agentSuggestionIds must be a non-empty array',
            });
            return;
        }
        if (!pointerNo || ![2, 3, 4].includes(Number(pointerNo))) {
            res.status(400).json({
                success: false,
                message: 'pointerNo must be 2, 3, or 4',
            });
            return;
        }
        const selected = await (0, pointer234Activity_service_1.selectActivities)(studentIvyServiceId, ivyExpertId, agentSuggestionIds, Number(pointerNo), weightages // Pass weightages to service
        );
        res.status(200).json({
            success: true,
            message: 'Activities selected successfully',
            data: {
                count: selected.length,
                selectedActivityIds: selected.map((s) => s._id),
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to select activities',
        });
    }
};
exports.selectActivitiesHandler = selectActivitiesHandler;
/**
 * GET /pointer/activity/student/:studentId
 * Get all activities for a student with status
 */
const getStudentActivitiesHandler = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;
        if (!studentId) {
            res.status(400).json({
                success: false,
                message: 'studentId is required',
            });
            return;
        }
        const activities = await (0, pointer234Activity_service_1.getStudentActivities)(studentId, studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: activities,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get student activities',
        });
    }
};
exports.getStudentActivitiesHandler = getStudentActivitiesHandler;
/**
 * POST /pointer/activity/proof/upload
 * Student uploads proof for an activity
 */
exports.uploadProofMiddleware = upload.array('proofFiles', 10); // Max 10 files
const uploadProofHandler = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
            return;
        }
        const { studentIvyServiceId, ivyExpertSelectedSuggestionId } = req.body;
        const authReq = req;
        const studentId = await (0, resolveRole_1.resolveStudentId)(authReq.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId is required',
            });
            return;
        }
        if (!ivyExpertSelectedSuggestionId) {
            res.status(400).json({
                success: false,
                message: 'ivyExpertSelectedSuggestionId is required',
            });
            return;
        }
        const submission = await (0, pointer234Activity_service_1.uploadProof)(studentIvyServiceId, studentId, ivyExpertSelectedSuggestionId, files);
        res.status(200).json({
            success: true,
            message: 'Proof uploaded successfully',
            data: {
                _id: submission._id,
                files: submission.files,
                submittedAt: submission.submittedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload proof',
        });
    }
};
exports.uploadProofHandler = uploadProofHandler;
/**
 * POST /pointer/activity/evaluate
 * Ivy Expert evaluates an activity
 */
const evaluateActivityHandler = async (req, res) => {
    try {
        const { studentSubmissionId, score, feedback } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentSubmissionId) {
            res.status(400).json({
                success: false,
                message: 'studentSubmissionId is required',
            });
            return;
        }
        if (score === undefined || score === null) {
            res.status(400).json({
                success: false,
                message: 'score is required (0-10)',
            });
            return;
        }
        const evaluation = await (0, pointer234Activity_service_1.evaluateActivity)(studentSubmissionId, ivyExpertId, score, feedback);
        res.status(200).json({
            success: true,
            message: 'Activity evaluated successfully',
            data: {
                _id: evaluation._id,
                score: evaluation.score,
                feedback: evaluation.feedback,
                evaluatedAt: evaluation.evaluatedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to evaluate activity',
        });
    }
};
exports.evaluateActivityHandler = evaluateActivityHandler;
/**
 * PUT /pointer/activity/weightages
 * Ivy Expert updates weightages for selected activities
 */
const updateWeightagesHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, weightages, pointerNo } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId is required',
            });
            return;
        }
        if (!weightages || typeof weightages !== 'object') {
            res.status(400).json({
                success: false,
                message: 'weightages object is required',
            });
            return;
        }
        const updated = await (0, pointer234Activity_service_1.updateWeightages)(studentIvyServiceId, ivyExpertId, weightages, pointerNo);
        res.status(200).json({
            success: true,
            message: 'Weightages updated successfully',
            data: {
                count: updated.length,
            },
        });
    }
    catch (error) {
        console.error('Update weightages error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update weightages',
        });
    }
};
exports.updateWeightagesHandler = updateWeightagesHandler;
//# sourceMappingURL=pointer234Activity.controller.js.map