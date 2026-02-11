"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchStudentInterest = exports.getStudentInterestData = void 0;
const studentInterest_service_1 = require("../services/studentInterest.service");
const getStudentInterestData = async (req, res) => {
    try {
        const { studentIvyServiceId } = req.query;
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId is required',
            });
            return;
        }
        const service = await (0, studentInterest_service_1.getStudentInterest)(studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: {
                studentInterest: service.studentInterest || '',
                updatedAt: service.updatedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch student interest',
        });
    }
};
exports.getStudentInterestData = getStudentInterestData;
/**
 * PATCH /api/student-interest
 * Store student interest - plain text, overwrite allowed, no validation
 */
const patchStudentInterest = async (req, res) => {
    try {
        const { studentIvyServiceId, studentInterest } = req.body;
        if (!studentIvyServiceId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId is required',
            });
            return;
        }
        // Store as plain text - no validation, overwrite allowed
        const updatedService = await (0, studentInterest_service_1.updateStudentInterest)(studentIvyServiceId, studentInterest || '');
        res.status(200).json({
            success: true,
            message: 'Student interest updated successfully',
            data: {
                studentInterest: updatedService.studentInterest,
                updatedAt: updatedService.updatedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update student interest',
        });
    }
};
exports.patchStudentInterest = patchStudentInterest;
//# sourceMappingURL=studentInterest.controller.js.map