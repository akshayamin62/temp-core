"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyServiceHandler = exports.getServiceByStudentIdHandler = exports.getServiceDetailsHandler = exports.updateInterestHandler = exports.getStudentsForIvyExpertHandler = exports.getMyStudentsHandler = exports.createIvyService = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const ivyService_service_1 = require("../services/ivyService.service");
const createIvyService = async (req, res) => {
    try {
        const { studentId, ivyExpertId } = req.body;
        // Validate input
        if (!studentId || !ivyExpertId) {
            res.status(400).json({
                success: false,
                message: 'studentId and ivyExpertId are required'
            });
            return;
        }
        // Call service layer
        const newService = await (0, ivyService_service_1.createStudentIvyService)(studentId, ivyExpertId);
        // Return created document
        res.status(201).json({
            success: true,
            message: 'Ivy League service created successfully',
            data: newService,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create Ivy League service',
        });
    }
};
exports.createIvyService = createIvyService;
/**
 * Auth-based: Get students for the logged-in ivy expert.
 * Derives IvyExpert._id from req.user.userId (JWT).
 */
const getMyStudentsHandler = async (req, res) => {
    try {
        const authReq = req;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(authReq.user.userId);
        const students = await (0, ivyService_service_1.getStudentsForIvyExpert)(ivyExpertId);
        res.status(200).json({
            success: true,
            data: students,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch students',
        });
    }
};
exports.getMyStudentsHandler = getMyStudentsHandler;
const getStudentsForIvyExpertHandler = async (req, res) => {
    try {
        const { ivyExpertId } = req.params;
        if (!ivyExpertId) {
            res.status(400).json({ success: false, message: 'ivyExpertId is required' });
            return;
        }
        const students = await (0, ivyService_service_1.getStudentsForIvyExpert)(ivyExpertId);
        res.status(200).json({
            success: true,
            data: students,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch students',
        });
    }
};
exports.getStudentsForIvyExpertHandler = getStudentsForIvyExpertHandler;
const updateInterestHandler = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { interest } = req.body;
        if (!interest) {
            res.status(400).json({ success: false, message: 'Interest is required' });
            return;
        }
        const updatedService = await (0, ivyService_service_1.updateStudentInterest)(serviceId, interest);
        res.status(200).json({
            success: true,
            data: updatedService,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update interest',
        });
    }
};
exports.updateInterestHandler = updateInterestHandler;
const getServiceDetailsHandler = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await (0, ivyService_service_1.getStudentIvyServiceById)(serviceId);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch service details',
        });
    }
};
exports.getServiceDetailsHandler = getServiceDetailsHandler;
const getServiceByStudentIdHandler = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            res.status(400).json({ success: false, message: 'studentId is required' });
            return;
        }
        const service = await (0, ivyService_service_1.getServiceByStudentId)(studentId);
        if (!service) {
            res.status(404).json({ success: false, message: 'No service found for this student' });
            return;
        }
        res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch service for student',
        });
    }
};
exports.getServiceByStudentIdHandler = getServiceByStudentIdHandler;
/**
 * GET /api/ivy/ivy-service/my-service
 * Auth-based: get the logged-in student's ivy service registration
 */
const getMyServiceHandler = async (req, res) => {
    try {
        const authReq = req;
        const userId = authReq.user.userId;
        const service = await (0, ivyService_service_1.getServiceByStudentId)(userId);
        if (!service) {
            res.status(404).json({ success: false, message: 'No Ivy service found for this student' });
            return;
        }
        res.status(200).json({ success: true, data: service });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to fetch service' });
    }
};
exports.getMyServiceHandler = getMyServiceHandler;
//# sourceMappingURL=ivyService.controller.js.map