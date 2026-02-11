import { Response } from "express";
import User from "../models/User";
import Admin from "../models/Admin";
import { USER_ROLE } from "../types/roles";
import Counselor from "../models/Counselor";
import Lead from "../models/Lead";
import FollowUp, { FOLLOWUP_STATUS } from "../models/FollowUp";
import Student from "../models/Student";
import { AuthRequest } from "../types/auth";

/**
 * Create a new Counselor (Admin only)
 */
export const createCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with COUNSELOR role (no password - will use OTP login)
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.COUNSELOR,
      isVerified: true, // Auto-verify counselors created by admin
      isActive: true,
    });

    await newUser.save();

    // Create Counselor profile linked to the admin
    const newCounselor = new Counselor({
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
  } catch (error: any) {
    console.error('Create counselor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create counselor',
      error: error.message,
    });
  }
};

/**
 * Get all counselors created by the logged-in admin
 */
export const getCounselors = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find counselors created by this admin
    const counselors = await Counselor.find({ adminId: adminUserId })
      .populate('userId', 'firstName middleName lastName email isActive isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Counselors fetched successfully',
      data: {
        counselors: counselors.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get counselors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch counselors',
      error: error.message,
    });
  }
};

/**
 * Toggle counselor active status (Admin only)
 */
export const toggleCounselorStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const counselor = await Counselor.findOne({
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
    const user = await User.findById(counselor.userId);
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
  } catch (error: any) {
    console.error('Toggle counselor status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle counselor status',
      error: error.message,
    });
  }
};

/**
 * Get counselor detail with dashboard data (Admin only)
 */
export const getCounselorDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const counselor = await Counselor.findOne({
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
    const leads = await Lead.find({
      assignedCounselorId: counselorId,
    }).sort({ createdAt: -1 });

    // Get admin's enquiry form slug
    const admin = await Admin.findOne({ userId: adminUserId });

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
  } catch (error: any) {
    console.error('Get counselor detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch counselor detail',
      error: error.message,
    });
  }
};

/**
 * Get counselor's follow-ups (Admin only)
 */
export const getCounselorFollowUps = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const counselor = await Counselor.findOne({
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
    const followUps = await FollowUp.find({
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
  } catch (error: any) {
    console.error('Get counselor follow-ups error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch counselor follow-ups',
      error: error.message,
    });
  }
};

/**
 * Get counselor's follow-up summary (Admin only)
 */
export const getCounselorFollowUpSummary = async (req: AuthRequest, res: Response): Promise<Response> => {
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
    const counselor = await Counselor.findOne({
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
    const todayFollowUps = await FollowUp.find({
      counselorId: counselorId,
      scheduledDate: { $gte: today, $lt: tomorrow },
    })
      .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
      .sort({ scheduledTime: 1 });

    // Get missed follow-ups
    const missedFollowUps = await FollowUp.find({
      counselorId: counselorId,
      scheduledDate: { $lt: today },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
      .sort({ scheduledDate: -1 });

    // Get upcoming follow-ups
    const upcomingFollowUps = await FollowUp.find({
      counselorId: counselorId,
      scheduledDate: { $gt: tomorrow },
      status: FOLLOWUP_STATUS.SCHEDULED,
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
  } catch (error: any) {
    console.error('Get counselor follow-up summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch follow-up summary',
      error: error.message,
    });
  }
};

/**
 * Get admin dashboard stats
 */
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    // Find the admin record
    const admin = await Admin.findOne({ userId: adminUserId });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Count students under this admin
    const students = await Student.countDocuments({ adminId: admin._id });

    // Count counselors under this admin
    const counselors = await Counselor.countDocuments({ adminId: admin._id });

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
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
};
