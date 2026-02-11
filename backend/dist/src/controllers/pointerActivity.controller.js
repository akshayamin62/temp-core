"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDeadlineHandler = exports.getPointerActivityScoreHandler = exports.updateWeightagesHandler = exports.updateDocumentTaskStatusHandler = exports.uploadIvyExpertDocumentsHandler = exports.evaluateActivityHandler = exports.uploadProofHandler = exports.getStudentActivitiesHandler = exports.selectActivitiesHandler = exports.ivyExpertDocsMiddleware = exports.proofUploadMiddleware = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const multer_1 = __importDefault(require("multer"));
const pointerActivity_service_1 = require("../services/pointerActivity.service");
const pointer234Activity_service_1 = require("../services/pointer234Activity.service");
const StudentPointerScore_1 = __importDefault(require("../models/ivy/StudentPointerScore"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
    },
});
exports.proofUploadMiddleware = upload.array('proofFiles', 5);
exports.ivyExpertDocsMiddleware = upload.array('ivyExpertDocs', 5);
const selectActivitiesHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, pointerNo, agentSuggestionIds, isVisibleToStudent, weightages, deadlines } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        if (!pointerNo) {
            res.status(400).json({ success: false, message: 'pointerNo is required (2, 3, or 4)' });
            return;
        }
        if (!agentSuggestionIds || !Array.isArray(agentSuggestionIds) || agentSuggestionIds.length === 0) {
            res.status(400).json({ success: false, message: 'agentSuggestionIds must be a non-empty array' });
            return;
        }
        const selections = await (0, pointerActivity_service_1.selectActivities)(studentIvyServiceId, ivyExpertId, Number(pointerNo), agentSuggestionIds, isVisibleToStudent !== false, // default true
        weightages, // Pass weightages array
        deadlines);
        res.status(200).json({
            success: true,
            message: 'Activities saved successfully',
            data: selections.map(({ selection, suggestion }) => ({
                selectionId: selection._id,
                pointerNo: selection.pointerNo,
                isVisibleToStudent: selection.isVisibleToStudent,
                suggestion: {
                    _id: suggestion._id,
                    title: suggestion.title,
                    description: suggestion.description,
                    tags: suggestion.tags,
                },
            })),
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to save activities',
        });
    }
};
exports.selectActivitiesHandler = selectActivitiesHandler;
const getStudentActivitiesHandler = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId, includeInvisible } = req.query;
        const identifier = studentIvyServiceId ? studentIvyServiceId : studentId;
        const useServiceId = !!studentIvyServiceId;
        if (!identifier) {
            res.status(400).json({
                success: false,
                message: 'studentId or studentIvyServiceId is required',
            });
            return;
        }
        const data = await (0, pointerActivity_service_1.getStudentActivities)(identifier, useServiceId, includeInvisible === 'true');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch activities',
        });
    }
};
exports.getStudentActivitiesHandler = getStudentActivitiesHandler;
const uploadProofHandler = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No proof files uploaded' });
            return;
        }
        const { ivyExpertSelectedSuggestionId, remarks } = req.body;
        const authReq = req;
        const studentId = await (0, resolveRole_1.resolveStudentId)(authReq.user.userId);
        if (!ivyExpertSelectedSuggestionId) {
            res.status(400).json({ success: false, message: 'ivyExpertSelectedSuggestionId is required' });
            return;
        }
        const submission = await (0, pointerActivity_service_1.uploadProof)(ivyExpertSelectedSuggestionId, studentId, files, remarks);
        res.status(200).json({
            success: true,
            message: 'Proof uploaded successfully',
            data: {
                _id: submission._id,
                files: submission.files,
                remarks: submission.remarks,
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
const evaluateActivityHandler = async (req, res) => {
    try {
        const { studentSubmissionId, score, feedback } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!studentSubmissionId) {
            res.status(400).json({ success: false, message: 'studentSubmissionId is required' });
            return;
        }
        if (score === undefined || score === null) {
            res.status(400).json({ success: false, message: 'score is required (0-10)' });
            return;
        }
        const evaluation = await (0, pointerActivity_service_1.evaluateActivity)(studentSubmissionId, ivyExpertId, Number(score), feedback);
        res.status(200).json({
            success: true,
            message: 'Evaluation saved successfully',
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
const uploadIvyExpertDocumentsHandler = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No files uploaded' });
            return;
        }
        const { selectionId } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!selectionId) {
            res.status(400).json({ success: false, message: 'selectionId is required' });
            return;
        }
        const selection = await (0, pointerActivity_service_1.uploadIvyExpertDocuments)(selectionId, ivyExpertId, files);
        res.status(200).json({
            success: true,
            message: 'Documents uploaded successfully',
            data: {
                selectionId: selection._id,
                ivyExpertDocuments: selection.ivyExpertDocuments,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload documents',
        });
    }
};
exports.uploadIvyExpertDocumentsHandler = uploadIvyExpertDocumentsHandler;
const updateDocumentTaskStatusHandler = async (req, res) => {
    try {
        const { selectionId, documentUrl, taskIndex, status } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!selectionId) {
            res.status(400).json({ success: false, message: 'selectionId is required' });
            return;
        }
        if (!documentUrl) {
            res.status(400).json({ success: false, message: 'documentUrl is required' });
            return;
        }
        if (typeof taskIndex !== 'number') {
            res.status(400).json({ success: false, message: 'taskIndex is required' });
            return;
        }
        if (!status || !['not-started', 'in-progress', 'completed'].includes(status)) {
            res.status(400).json({ success: false, message: 'status must be one of: not-started, in-progress, completed' });
            return;
        }
        const selection = await (0, pointerActivity_service_1.updateDocumentTaskStatus)(selectionId, ivyExpertId, documentUrl, taskIndex, status);
        res.status(200).json({
            success: true,
            message: 'Task status updated successfully',
            data: {
                selectionId: selection._id,
                ivyExpertDocuments: selection.ivyExpertDocuments,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update task status',
        });
    }
};
exports.updateDocumentTaskStatusHandler = updateDocumentTaskStatusHandler;
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
const getPointerActivityScoreHandler = async (req, res) => {
    try {
        const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;
        const pointerNo = req.params.pointerNo || req.query.pointerNo;
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        if (!pointerNo) {
            res.status(400).json({ success: false, message: 'pointerNo is required' });
            return;
        }
        // Read from StudentPointerScore which has the weighted average score
        // This ensures consistency with the dashboard
        const pointerScore = await StudentPointerScore_1.default.findOne({
            studentIvyServiceId,
            pointerNo: Number(pointerNo),
        });
        if (!pointerScore) {
            // If no score record exists yet, return 0
            res.status(200).json({ success: true, data: 0 });
            return;
        }
        // Return the normalized score (already calculated as weighted average)
        const normalizedScore = (pointerScore.scoreObtained / pointerScore.maxScore) * 10;
        res.status(200).json({
            success: true,
            data: Math.round(normalizedScore * 100) / 100, // Round to 2 decimals
        });
    }
    catch (error) {
        console.error('Get pointer activity score error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pointer activity score',
        });
    }
};
exports.getPointerActivityScoreHandler = getPointerActivityScoreHandler;
const setDeadlineHandler = async (req, res) => {
    try {
        const { selectionId, deadline } = req.body;
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        if (!selectionId) {
            res.status(400).json({ success: false, message: 'selectionId is required' });
            return;
        }
        if (!deadline) {
            res.status(400).json({ success: false, message: 'deadline is required' });
            return;
        }
        const selection = await (0, pointerActivity_service_1.setActivityDeadline)(selectionId, ivyExpertId, deadline);
        res.status(200).json({
            success: true,
            message: 'Deadline set successfully',
            data: {
                selectionId: selection._id,
                deadline: selection.deadline,
            },
        });
    }
    catch (error) {
        console.error('Set deadline error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to set deadline',
        });
    }
};
exports.setDeadlineHandler = setDeadlineHandler;
//# sourceMappingURL=pointerActivity.controller.js.map