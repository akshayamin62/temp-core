"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentByLeadId = exports.getAdminStudentFormAnswers = exports.getAdminStudentDetails = exports.getAdminStudents = void 0;
const Student_1 = __importDefault(require("../models/Student"));
const User_1 = __importDefault(require("../models/User"));
const Admin_1 = __importDefault(require("../models/Admin"));
const Counselor_1 = __importDefault(require("../models/Counselor"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const StudentFormAnswer_1 = __importDefault(require("../models/StudentFormAnswer"));
const LeadStudentConversion_1 = __importDefault(require("../models/LeadStudentConversion"));
const roles_1 = require("../types/roles");
/**
 * Get all students for the admin (students converted under this admin)
 * Admin can only see students that were converted under their admin
 */
const getAdminStudents = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (!user || (user.role !== roles_1.USER_ROLE.ADMIN && user.role !== roles_1.USER_ROLE.COUNSELOR && user.role !== roles_1.USER_ROLE.SUPER_ADMIN)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        let adminId = null;
        let counselorId = null;
        // Get admin or counselor reference
        if (user.role === roles_1.USER_ROLE.ADMIN) {
            const admin = await Admin_1.default.findOne({ userId });
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin record not found',
                });
            }
            adminId = admin._id;
        }
        else if (user.role === roles_1.USER_ROLE.COUNSELOR) {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: 'Counselor record not found',
                });
            }
            counselorId = counselor._id;
        }
        // Find all students under this admin or assigned to this counselor
        const studentQuery = {};
        if (adminId) {
            studentQuery.adminId = adminId;
        }
        else if (counselorId) {
            studentQuery.counselorId = counselorId;
        }
        const students = await Student_1.default.find(studentQuery)
            .populate('userId', 'firstName middleName lastName email isVerified isActive createdAt')
            .populate({
            path: 'adminId',
            populate: {
                path: 'userId',
                select: 'firstName middleName lastName email'
            }
        })
            .populate({
            path: 'counselorId',
            populate: {
                path: 'userId',
                select: 'firstName middleName lastName email'
            }
        })
            .sort({ createdAt: -1 });
        // Get registration count and conversion info for each student
        const studentsWithStats = await Promise.all(students.map(async (student) => {
            const registrationCount = await StudentServiceRegistration_1.default.countDocuments({
                studentId: student._id,
            });
            // Get conversion info if exists
            const conversion = await LeadStudentConversion_1.default.findOne({
                studentId: student._id,
            }).populate({
                path: 'leadId',
                select: 'name email mobileNumber'
            });
            return {
                _id: student._id,
                user: student.userId,
                mobileNumber: student.mobileNumber,
                adminId: student.adminId,
                counselorId: student.counselorId,
                registrationCount,
                createdAt: student.createdAt,
                convertedFromLead: conversion?.leadId || null,
            };
        }));
        return res.status(200).json({
            success: true,
            message: 'Students fetched successfully',
            data: {
                students: studentsWithStats,
                total: studentsWithStats.length,
            },
        });
    }
    catch (error) {
        console.error('Get admin students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message,
        });
    }
};
exports.getAdminStudents = getAdminStudents;
/**
 * Get student details (read-only for admin)
 */
const getAdminStudentDetails = async (req, res) => {
    try {
        const { studentId } = req.params;
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (!user || (user.role !== roles_1.USER_ROLE.ADMIN && user.role !== roles_1.USER_ROLE.COUNSELOR && user.role !== roles_1.USER_ROLE.SUPER_ADMIN)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const student = await Student_1.default.findById(studentId)
            .populate('userId', 'firstName middleName lastName name email role isVerified isActive createdAt')
            .populate({
            path: 'adminId',
            populate: {
                path: 'userId',
                select: 'firstName middleName lastName name email'
            }
        })
            .populate({
            path: 'counselorId',
            populate: {
                path: 'userId',
                select: 'firstName middleName lastName name email'
            }
        })
            .lean()
            .exec();
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }
        // For admin, verify this student belongs to their admin
        if (user.role === roles_1.USER_ROLE.ADMIN) {
            const admin = await Admin_1.default.findOne({ userId });
            if (!admin || student.adminId?._id?.toString() !== admin._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Student does not belong to your admin',
                });
            }
        }
        // For counselor, verify this student is assigned to them
        if (user.role === roles_1.USER_ROLE.COUNSELOR) {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(403).json({
                    success: false,
                    message: 'Counselor not found',
                });
            }
            // Check if student is assigned to this counselor
            if (!student.counselorId || student.counselorId._id?.toString() !== counselor._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Student is not assigned to you',
                });
            }
        }
        // Get registrations
        const registrations = await StudentServiceRegistration_1.default.find({ studentId })
            .populate('serviceId', 'name slug shortDescription')
            .populate({
            path: 'primaryOpsId',
            populate: { path: 'userId', select: 'firstName middleName lastName name email' }
        })
            .populate({
            path: 'secondaryOpsId',
            populate: { path: 'userId', select: 'firstName middleName lastName name email' }
        })
            .populate({
            path: 'activeOpsId',
            populate: { path: 'userId', select: 'firstName middleName lastName name email' }
        })
            .lean()
            .exec();
        return res.status(200).json({
            success: true,
            message: 'Student details fetched successfully',
            data: {
                student,
                registrations,
            },
        });
    }
    catch (error) {
        console.error('Get student details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student details',
            error: error.message,
        });
    }
};
exports.getAdminStudentDetails = getAdminStudentDetails;
/**
 * Get student form answers for a registration (read-only for admin)
 */
const getAdminStudentFormAnswers = async (req, res) => {
    try {
        const { studentId, registrationId } = req.params;
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (!user || (user.role !== roles_1.USER_ROLE.ADMIN && user.role !== roles_1.USER_ROLE.COUNSELOR && user.role !== roles_1.USER_ROLE.SUPER_ADMIN)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // Get student to verify ownership
        const student = await Student_1.default.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }
        // For admin, verify this student belongs to their admin
        if (user.role === roles_1.USER_ROLE.ADMIN) {
            const admin = await Admin_1.default.findOne({ userId });
            if (!admin || student.adminId?.toString() !== admin._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Student does not belong to your admin',
                });
            }
        }
        // For counselor, verify this student is assigned to them
        if (user.role === roles_1.USER_ROLE.COUNSELOR) {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(403).json({
                    success: false,
                    message: 'Counselor not found',
                });
            }
            // Check if student is assigned to this counselor
            if (!student.counselorId || student.counselorId.toString() !== counselor._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - Student is not assigned to you',
                });
            }
        }
        // Get registration
        const registration = await StudentServiceRegistration_1.default.findById(registrationId)
            .populate('serviceId');
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found',
            });
        }
        // Get form answers
        const answers = await StudentFormAnswer_1.default.find({
            studentId,
            registrationId,
        }).lean().exec();
        return res.status(200).json({
            success: true,
            message: 'Form answers fetched successfully',
            data: {
                registration,
                answers,
            },
        });
    }
    catch (error) {
        console.error('Get form answers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch form answers',
            error: error.message,
        });
    }
};
exports.getAdminStudentFormAnswers = getAdminStudentFormAnswers;
/**
 * Get student by lead ID (for converted leads)
 */
const getStudentByLeadId = async (req, res) => {
    try {
        const { leadId } = req.params;
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (!user || (user.role !== roles_1.USER_ROLE.ADMIN && user.role !== roles_1.USER_ROLE.COUNSELOR && user.role !== roles_1.USER_ROLE.SUPER_ADMIN)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // Find conversion record
        const conversion = await LeadStudentConversion_1.default.findOne({
            leadId,
            status: 'APPROVED'
        }).populate({
            path: 'createdStudentId',
            populate: [
                { path: 'userId', select: 'firstName middleName lastName email isVerified isActive createdAt' },
                { path: 'adminId', populate: { path: 'userId', select: 'firstName middleName lastName email' } },
                { path: 'counselorId', populate: { path: 'userId', select: 'firstName middleName lastName email' } }
            ]
        });
        if (!conversion || !conversion.createdStudentId) {
            return res.status(404).json({
                success: false,
                message: 'No converted student found for this lead',
            });
        }
        const student = conversion.createdStudentId;
        // Get registrations
        const registrations = await StudentServiceRegistration_1.default.find({ studentId: student._id })
            .populate('serviceId', 'name slug shortDescription')
            .lean()
            .exec();
        return res.status(200).json({
            success: true,
            message: 'Student found successfully',
            data: {
                student,
                registrations,
                conversion: {
                    _id: conversion._id,
                    status: conversion.status,
                    approvedAt: conversion.approvedAt,
                }
            },
        });
    }
    catch (error) {
        console.error('Get student by lead ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student',
            error: error.message,
        });
    }
};
exports.getStudentByLeadId = getStudentByLeadId;
//# sourceMappingURL=adminStudentController.js.map