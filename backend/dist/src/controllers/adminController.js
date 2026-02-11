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
exports.getAdminStats = exports.getCounselorFollowUpSummary = exports.getCounselorFollowUps = exports.getCounselorDetail = exports.toggleCounselorStatus = exports.getCounselors = exports.createCounselor = void 0;
const User_1 = __importDefault(require("../models/User"));
const Admin_1 = __importDefault(require("../models/Admin"));
const roles_1 = require("../types/roles");
const Counselor_1 = __importDefault(require("../models/Counselor"));
const Lead_1 = __importDefault(require("../models/Lead"));
const FollowUp_1 = __importStar(require("../models/FollowUp"));
const Student_1 = __importDefault(require("../models/Student"));
/**
 * Create a new Counselor (Admin only)
 */
const createCounselor = async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, mobileNumber } = req.body;
        const adminUserId = req.user?.userId; // Admin's user ID from auth middleware
        // Validation
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and email are required',
            });
        }
        if (!mobileNumber || !mobileNumber.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required',
            });
        }
        // Validate phone number format
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
        if (!phoneRegex.test(mobileNumber.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format. Please use only numbers and allowed characters (+, -, (), spaces)',
            });
        }
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }
        // Create user with COUNSELOR role (no password - will use OTP login)
        const newUser = new User_1.default({
            firstName: firstName.trim(),
            middleName: middleName?.trim() || undefined,
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            role: roles_1.USER_ROLE.COUNSELOR,
            isVerified: true, // Auto-verify counselors created by admin
            isActive: true,
        });
        await newUser.save();
        // Create Counselor profile linked to the admin
        const newCounselor = new Counselor_1.default({
            userId: newUser._id,
            adminId: adminUserId, // Link to the admin who created this counselor
            email: email.toLowerCase().trim(),
            mobileNumber: mobileNumber?.trim() || undefined,
        });
        await newCounselor.save();
        // TODO: Send email with credentials
        return res.status(201).json({
            success: true,
            message: 'Counselor created successfully',
            data: {
                counselor: {
                    _id: newCounselor._id,
                    userId: newUser._id,
                    firstName: newUser.firstName,
                    middleName: newUser.middleName,
                    lastName: newUser.lastName,
                    email: newUser.email,
                    mobileNumber: newCounselor.mobileNumber,
                },
            },
        });
    }
    catch (error) {
        console.error('Create counselor error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create counselor',
            error: error.message,
        });
    }
};
exports.createCounselor = createCounselor;
/**
 * Get all counselors created by the logged-in admin
 */
const getCounselors = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Find counselors created by this admin
        const counselors = await Counselor_1.default.find({ adminId: adminUserId })
            .populate('userId', 'firstName middleName lastName email isActive isVerified')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: 'Counselors fetched successfully',
            data: {
                counselors: counselors.map((c) => ({
                    _id: c._id,
                    userId: c.userId,
                    email: c.email,
                    mobileNumber: c.mobileNumber,
                    createdAt: c.createdAt,
                })),
            },
        });
    }
    catch (error) {
        console.error('Get counselors error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch counselors',
            error: error.message,
        });
    }
};
exports.getCounselors = getCounselors;
/**
 * Toggle counselor active status (Admin only)
 */
const toggleCounselorStatus = async (req, res) => {
    try {
        const { counselorId } = req.params;
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Find counselor and verify it belongs to this admin
        const counselor = await Counselor_1.default.findOne({
            _id: counselorId,
            adminId: adminUserId,
        });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: 'Counselor not found or unauthorized',
            });
        }
        // Toggle the isActive status in User model
        const user = await User_1.default.findById(counselor.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        user.isActive = !user.isActive;
        await user.save();
        return res.status(200).json({
            success: true,
            message: `Counselor ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                isActive: user.isActive,
            },
        });
    }
    catch (error) {
        console.error('Toggle counselor status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle counselor status',
            error: error.message,
        });
    }
};
exports.toggleCounselorStatus = toggleCounselorStatus;
/**
 * Get counselor detail with dashboard data (Admin only)
 */
const getCounselorDetail = async (req, res) => {
    try {
        const { counselorId } = req.params;
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Find counselor and verify it belongs to this admin
        const counselor = await Counselor_1.default.findOne({
            _id: counselorId,
            adminId: adminUserId,
        }).populate('userId', 'firstName middleName lastName email isActive isVerified');
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: 'Counselor not found or unauthorized',
            });
        }
        // Get counselor's leads
        const leads = await Lead_1.default.find({
            assignedCounselorId: counselorId,
        }).sort({ createdAt: -1 });
        // Get admin's enquiry form slug
        const admin = await Admin_1.default.findOne({ userId: adminUserId });
        return res.status(200).json({
            success: true,
            data: {
                counselor: {
                    _id: counselor._id,
                    userId: counselor.userId,
                    email: counselor.email,
                    mobileNumber: counselor.mobileNumber,
                    createdAt: counselor.createdAt,
                },
                leads,
                enquirySlug: admin?.enquiryFormSlug || '',
            },
        });
    }
    catch (error) {
        console.error('Get counselor detail error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch counselor detail',
            error: error.message,
        });
    }
};
exports.getCounselorDetail = getCounselorDetail;
/**
 * Get counselor's follow-ups (Admin only)
 */
const getCounselorFollowUps = async (req, res) => {
    try {
        const { counselorId } = req.params;
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Verify counselor belongs to this admin
        const counselor = await Counselor_1.default.findOne({
            _id: counselorId,
            adminId: adminUserId,
        });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: 'Counselor not found or unauthorized',
            });
        }
        // Get follow-ups
        const followUps = await FollowUp_1.default.find({
            counselorId: counselorId,
        })
            .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({
            success: true,
            data: {
                followUps,
            },
        });
    }
    catch (error) {
        console.error('Get counselor follow-ups error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch counselor follow-ups',
            error: error.message,
        });
    }
};
exports.getCounselorFollowUps = getCounselorFollowUps;
/**
 * Get counselor's follow-up summary (Admin only)
 */
const getCounselorFollowUpSummary = async (req, res) => {
    try {
        const { counselorId } = req.params;
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Verify counselor belongs to this admin
        const counselor = await Counselor_1.default.findOne({
            _id: counselorId,
            adminId: adminUserId,
        });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: 'Counselor not found or unauthorized',
            });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Get today's follow-ups
        const todayFollowUps = await FollowUp_1.default.find({
            counselorId: counselorId,
            scheduledDate: { $gte: today, $lt: tomorrow },
        })
            .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
            .sort({ scheduledTime: 1 });
        // Get missed follow-ups
        const missedFollowUps = await FollowUp_1.default.find({
            counselorId: counselorId,
            scheduledDate: { $lt: today },
            status: FollowUp_1.FOLLOWUP_STATUS.SCHEDULED,
        })
            .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
            .sort({ scheduledDate: -1 });
        // Get upcoming follow-ups
        const upcomingFollowUps = await FollowUp_1.default.find({
            counselorId: counselorId,
            scheduledDate: { $gt: tomorrow },
            status: FollowUp_1.FOLLOWUP_STATUS.SCHEDULED,
        })
            .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
            .sort({ scheduledDate: 1, scheduledTime: 1 })
            .limit(10);
        return res.status(200).json({
            success: true,
            data: {
                today: todayFollowUps,
                missed: missedFollowUps,
                upcoming: upcomingFollowUps,
            },
        });
    }
    catch (error) {
        console.error('Get counselor follow-up summary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch follow-up summary',
            error: error.message,
        });
    }
};
exports.getCounselorFollowUpSummary = getCounselorFollowUpSummary;
/**
 * Get admin dashboard stats
 */
const getAdminStats = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        // Find the admin record
        const admin = await Admin_1.default.findOne({ userId: adminUserId });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        // Count students under this admin
        const students = await Student_1.default.countDocuments({ adminId: admin._id });
        // Count counselors under this admin
        const counselors = await Counselor_1.default.countDocuments({ adminId: admin._id });
        return res.json({
            success: true,
            data: {
                total: students + counselors,
                students,
                counselors,
                alumni: 0,
                serviceProviders: 0,
                admins: 1,
            },
        });
    }
    catch (error) {
        console.error('Get admin stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
            error: error.message,
        });
    }
};
exports.getAdminStats = getAdminStats;
//# sourceMappingURL=adminController.js.map