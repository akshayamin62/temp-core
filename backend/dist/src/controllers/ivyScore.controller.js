"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateIvyScore = exports.getMyIvyScore = exports.getStudentIvyScore = void 0;
const ivyScore_service_1 = require("../services/ivyScore.service");
const ivyService_service_1 = require("../services/ivyService.service");
/**
 * GET /api/ivy-score/:studentId
 * Get Ivy readiness score for a student
 */
const getStudentIvyScore = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }
        const scoreCard = await (0, ivyScore_service_1.getIvyScore)(studentId, studentIvyServiceId);
        return res.status(200).json({
            success: true,
            data: scoreCard,
        });
    }
    catch (error) {
        console.error('Error fetching Ivy score:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Ivy score',
        });
    }
};
exports.getStudentIvyScore = getStudentIvyScore;
/**
 * POST /api/ivy-score/recalculate/:studentId
 * Manually recalculate Ivy score for a student
 */
/**
 * GET /api/ivy/ivy-score/my-score
 * Auth-based: get the logged-in student's ivy score
 */
const getMyIvyScore = async (req, res) => {
    try {
        const authReq = req;
        const userId = authReq.user.userId;
        // Resolve the correct Ivy League service registration for this student
        const service = await (0, ivyService_service_1.getServiceByStudentId)(userId);
        const studentIvyServiceId = service?._id?.toString();
        const scoreCard = await (0, ivyScore_service_1.getIvyScore)(userId, studentIvyServiceId);
        return res.status(200).json({ success: true, data: scoreCard });
    }
    catch (error) {
        console.error('Error fetching my Ivy score:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch Ivy score' });
    }
};
exports.getMyIvyScore = getMyIvyScore;
const recalculateIvyScore = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }
        const scoreCard = await (0, ivyScore_service_1.calculateIvyScore)(studentId, studentIvyServiceId);
        return res.status(200).json({
            success: true,
            message: 'Score recalculated successfully',
            data: scoreCard,
        });
    }
    catch (error) {
        console.error('Error recalculating Ivy score:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to recalculate Ivy score',
        });
    }
};
exports.recalculateIvyScore = recalculateIvyScore;
//# sourceMappingURL=ivyScore.controller.js.map