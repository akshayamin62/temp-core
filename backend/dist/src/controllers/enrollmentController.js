"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCounselingEnrollments = exports.getAllEnrollments = exports.assignCounselor = exports.updateEnrollmentStatus = exports.getEnrollmentById = exports.getMyEnrollments = exports.enrollInService = void 0;
const Enrollment_1 = require("../models/Enrollment");
const Student_1 = __importDefault(require("../models/Student"));
const Service_1 = __importDefault(require("../models/Service"));
const Counselor_1 = __importDefault(require("../models/Counselor"));
const roles_1 = require("../types/roles");
/**
 * @desc    Enroll student in a service
 * @route   POST /api/enrollments
 * @access  Private (Student only)
 */
const enrollInService = async (req, res) => {
    try {
        const { serviceId } = req.body;
        const userId = req.user.userId;
        if (!serviceId) {
            return res.status(400).json({
                success: false,
                message: 'Service ID is required',
            });
        }
        // Check if service exists and is active
        const service = await Service_1.default.findById(serviceId);
        if (!service || !service.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or inactive',
            });
        }
        // Get or create student profile
        let student = await Student_1.default.findOne({ user: userId });
        if (!student) {
            student = await Student_1.default.create({ user: userId });
        }
        // Check if already enrolled
        const existingEnrollment = await Enrollment_1.Enrollment.findOne({
            student: student._id,
            service: serviceId,
        });
        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'You are already enrolled in this service',
                data: { enrollment: existingEnrollment },
            });
        }
        // Create enrollment
        const enrollment = await Enrollment_1.Enrollment.create({
            student: student._id,
            service: serviceId,
            status: Enrollment_1.EnrollmentStatus.NOT_STARTED,
        });
        const populatedEnrollment = await Enrollment_1.Enrollment.findById(enrollment._id)
            .populate('service', 'name description')
            .populate('student');
        return res.status(201).json({
            success: true,
            message: 'Successfully enrolled in service',
            data: { enrollment: populatedEnrollment },
        });
    }
    catch (error) {
        console.error('Error enrolling in service:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.enrollInService = enrollInService;
/**
 * @desc    Get all enrollments for current user
 * @route   GET /api/enrollments
 * @access  Private (Student only)
 */
const getMyEnrollments = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Get student profile
        const student = await Student_1.default.findOne({ user: userId });
        if (!student) {
            return res.status(200).json({
                success: true,
                data: { enrollments: [], count: 0 },
            });
        }
        const enrollments = await Enrollment_1.Enrollment.find({ student: student._id })
            .populate('service', 'name description isActive')
            .populate('assignedCounselor')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                enrollments,
                count: enrollments.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching enrollments:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getMyEnrollments = getMyEnrollments;
/**
 * @desc    Get enrollment by ID
 * @route   GET /api/enrollments/:id
 * @access  Private (Student/Counselor/Admin)
 */
const getEnrollmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const enrollment = await Enrollment_1.Enrollment.findById(id)
            .populate('service')
            .populate('student')
            .populate('assignedCounselor');
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found',
            });
        }
        // Authorization check
        const student = await Student_1.default.findById(enrollment.student);
        if (userRole !== roles_1.USER_ROLE.ADMIN &&
            userRole !== roles_1.USER_ROLE.COUNSELOR &&
            student?.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this enrollment',
            });
        }
        return res.status(200).json({
            success: true,
            data: { enrollment },
        });
    }
    catch (error) {
        console.error('Error fetching enrollment:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getEnrollmentById = getEnrollmentById;
/**
 * @desc    Update enrollment status
 * @route   PATCH /api/enrollments/:id/status
 * @access  Private (Student/Counselor/Admin)
 */
const updateEnrollmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Object.values(Enrollment_1.EnrollmentStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required',
            });
        }
        const enrollment = await Enrollment_1.Enrollment.findById(id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found',
            });
        }
        enrollment.status = status;
        await enrollment.save();
        const updatedEnrollment = await Enrollment_1.Enrollment.findById(id)
            .populate('service', 'name description')
            .populate('assignedCounselor');
        return res.status(200).json({
            success: true,
            message: 'Enrollment status updated successfully',
            data: { enrollment: updatedEnrollment },
        });
    }
    catch (error) {
        console.error('Error updating enrollment status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.updateEnrollmentStatus = updateEnrollmentStatus;
/**
 * @desc    Assign counselor to enrollment
 * @route   PATCH /api/enrollments/:id/assign-counselor
 * @access  Private (Admin only)
 */
const assignCounselor = async (req, res) => {
    try {
        const { id } = req.params;
        const { counselorId } = req.body;
        if (!counselorId) {
            return res.status(400).json({
                success: false,
                message: 'Counselor ID is required',
            });
        }
        // Check if counselor exists
        const counselor = await Counselor_1.default.findById(counselorId);
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: 'Counselor not found',
            });
        }
        const enrollment = await Enrollment_1.Enrollment.findById(id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found',
            });
        }
        enrollment.assignedCounselor = counselorId;
        await enrollment.save();
        const updatedEnrollment = await Enrollment_1.Enrollment.findById(id)
            .populate('service', 'name description')
            .populate('assignedCounselor')
            .populate('student');
        return res.status(200).json({
            success: true,
            message: 'Counselor assigned successfully',
            data: { enrollment: updatedEnrollment },
        });
    }
    catch (error) {
        console.error('Error assigning counselor:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.assignCounselor = assignCounselor;
/**
 * @desc    Get all enrollments (Admin/Counselor)
 * @route   GET /api/enrollments/all
 * @access  Private (Admin/Counselor only)
 */
const getAllEnrollments = async (req, res) => {
    try {
        const { status, serviceId, counselorId } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (serviceId) {
            filter.service = serviceId;
        }
        if (counselorId) {
            filter.assignedCounselor = counselorId;
        }
        const enrollments = await Enrollment_1.Enrollment.find(filter)
            .populate('student')
            .populate('service', 'name description')
            .populate('assignedCounselor')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                enrollments,
                count: enrollments.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching all enrollments:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getAllEnrollments = getAllEnrollments;
/**
 * @desc    Get enrollments for assigned counselor
 * @route   GET /api/enrollments/my-students
 * @access  Private (Counselor only)
 */
const getMyCounselingEnrollments = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Get counselor profile
        const counselor = await Counselor_1.default.findOne({ user: userId });
        if (!counselor) {
            return res.status(200).json({
                success: true,
                data: { enrollments: [], count: 0 },
            });
        }
        const enrollments = await Enrollment_1.Enrollment.find({ assignedCounselor: counselor._id })
            .populate('student')
            .populate('service', 'name description')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                enrollments,
                count: enrollments.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching counseling enrollments:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getMyCounselingEnrollments = getMyCounselingEnrollments;
//# sourceMappingURL=enrollmentController.js.map