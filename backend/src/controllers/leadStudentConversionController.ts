import { Response } from "express";
import { AuthRequest } from "../types/auth";
import LeadStudentConversion, { CONVERSION_STATUS } from "../models/LeadStudentConversion";
import Lead, { LEAD_STAGE } from "../models/Lead";
import Student from "../models/Student";
import User from "../models/User";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
import StudentFormAnswer from "../models/StudentFormAnswer";
import FormPart from "../models/FormPart";
import FormSection from "../models/FormSection";
import FormSubSection from "../models/FormSubSection";
import FollowUp, { FOLLOWUP_STATUS } from "../models/FollowUp";
import { USER_ROLE } from "../types/roles";
import mongoose from "mongoose";
import { generateOTP } from "../utils/otp";
import { sendStudentAccountCreatedEmail } from "../utils/email";

/**
 * Helper function to parse full name into first, middle, and last name
 */
const parseName = (fullName: string): { firstName: string; middleName: string; lastName: string } => {
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], middleName: '', lastName: '' };
  } else if (nameParts.length === 2) {
    return { firstName: nameParts[0], middleName: '', lastName: nameParts[1] };
  } else {
    // 3 or more parts: first is firstName, last is lastName, everything in between is middleName
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const middleName = nameParts.slice(1, -1).join(' ');
    return { firstName, middleName, lastName };
  }
};

/**
 * Request conversion of lead to student (Counselor)
 */
export const requestConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Get counselor
    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(403).json({
        success: false,
        message: "Only counselors can request conversion"
      });
    }

    // Get lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Check if lead is assigned to this counselor
    if (lead.assignedCounselorId?.toString() !== counselor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only convert leads assigned to you"
      });
    }

    // Check if lead is already converted or has pending conversion
    if (lead.stage === LEAD_STAGE.CONVERTED) {
      return res.status(400).json({
        success: false,
        message: "Lead is already converted to student"
      });
    }

    if (lead.conversionStatus === 'PENDING') {
      return res.status(400).json({
        success: false,
        message: "Conversion request already pending for this lead"
      });
    }

    // Get admin for this lead
    const admin = await Admin.findOne({ userId: lead.adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found for this lead"
      });
    }

    // Create conversion request
    const conversionRequest = new LeadStudentConversion({
      leadId: lead._id,
      requestedBy: userId,
      adminId: admin._id,
      status: CONVERSION_STATUS.PENDING
    });

    await conversionRequest.save();

    // Update lead with conversion request reference
    lead.conversionRequestId = conversionRequest._id as mongoose.Types.ObjectId;
    lead.conversionStatus = 'PENDING';
    await lead.save();

    return res.status(201).json({
      success: true,
      message: "Conversion request submitted successfully. Waiting for admin approval.",
      data: conversionRequest
    });
  } catch (error) {
    console.error("Error requesting conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request conversion"
    });
  }
};

/**
 * Get all pending conversion requests (Admin)
 */
export const getPendingConversions = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    let query: any = { status: CONVERSION_STATUS.PENDING };

    // If admin, only get their pending conversions
    if (userRole === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin) {
        return res.status(403).json({
          success: false,
          message: "Admin not found"
        });
      }
      query.adminId = admin._id;
    }

    const conversions = await LeadStudentConversion.find(query)
      .populate({
        path: 'leadId',
        select: 'name email mobileNumber city serviceTypes stage'
      })
      .populate({
        path: 'requestedBy',
        select: 'firstName middleName lastName email'
      })
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions
    });
  } catch (error) {
    console.error("Error fetching pending conversions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending conversions"
    });
  }
};

/**
 * Approve conversion request (Admin)
 */
export const approveConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { conversionId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    console.log('🔍 Approve Conversion Request:', { conversionId, userId, userRole });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Get conversion request
    const conversion = await LeadStudentConversion.findById(conversionId);
    console.log('📄 Conversion found:', conversion ? 'Yes' : 'No', conversion?._id);
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: "Conversion request not found"
      });
    }

    if (conversion.status !== CONVERSION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Conversion request is already ${conversion.status.toLowerCase()}`
      });
    }

    // Check admin authorization
    if (userRole === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      console.log('👤 Admin check:', { userId, adminFound: !!admin, adminId: admin?._id, conversionAdminId: conversion.adminId });
      if (!admin || admin._id.toString() !== conversion.adminId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only approve conversions for your organization"
        });
      }
    }

    // Get lead details
    const lead = await Lead.findById(conversion.leadId);
    console.log('📧 Lead found:', { leadId: conversion.leadId, found: !!lead, email: lead?.email });
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Get admin details
    const admin = await Admin.findById(conversion.adminId);
    console.log('👨‍💼 Admin found:', { adminId: conversion.adminId, found: !!admin });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Get counselor details
    const counselor = lead.assignedCounselorId 
      ? await Counselor.findById(lead.assignedCounselorId)
      : null;

    // Check if user with this email already exists
    let existingUser = await User.findOne({ email: lead.email.toLowerCase() });
    
    if (existingUser) {
      // Check if already a student
      const existingStudent = await Student.findOne({ userId: existingUser._id });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: "A student account already exists with this email"
        });
      }
    }

    // Create user and student (without transaction for standalone MongoDB)
    let newUser;
    
    if (!existingUser) {
      // Create new user - split lead name into firstName/lastName
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Parse lead.name into firstName and lastName
      const nameParts = (lead.name || '').trim().split(/\s+/);
      const leadFirstName = nameParts[0] || 'Unknown';
      const leadLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      newUser = new User({
        firstName: leadFirstName,
        lastName: leadLastName || leadFirstName, // fallback if single name
        email: lead.email.toLowerCase(),
        role: USER_ROLE.STUDENT,
        isVerified: true,
        isActive: true,
        otp,
        otpExpiry
      });

      await newUser.save();
      console.log('✅ User created:', newUser._id);

      // Send account creation email with login link
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/';
        await sendStudentAccountCreatedEmail(lead.email, lead.name, loginUrl);
        console.log('✅ Account creation email sent to:', lead.email);
      } catch (emailError) {
        console.error("⚠️ Failed to send account creation email:", emailError);
        // Continue with conversion even if email fails
      }
    } else {
      newUser = existingUser;
      console.log('✅ Using existing user:', newUser._id);
    }

    // Create student record
    const newStudent = new Student({
      userId: newUser._id,
      email: lead.email.toLowerCase(),
      mobileNumber: lead.mobileNumber,
      adminId: admin._id,
      counselorId: counselor?._id || null,
      convertedFromLeadId: lead._id,
      conversionDate: new Date()
    });

    await newStudent.save();
    console.log('✅ Student created:', newStudent._id);

    // Parse lead name into first, middle, and last name
    const { firstName, middleName, lastName } = parseName(lead.name);

    // Pre-populate student form with lead information
    try {
      // Find the PROFILE part
      const profilePart = await FormPart.findOne({ key: 'PROFILE' });
      if (!profilePart) {
        throw new Error('PROFILE part not found');
      }

      // Find the "Personal Details" section under PROFILE
      const personalDetailsSection = await FormSection.findOne({
        partId: profilePart._id,
        title: 'Personal Details'
      });
      if (!personalDetailsSection) {
        throw new Error('Personal Details section not found');
      }

      // Find the "Personal Information" subsection
      const personalInfoSubSection = await FormSubSection.findOne({
        sectionId: personalDetailsSection._id,
        title: 'Personal Information'
      });
      if (!personalInfoSubSection) {
        throw new Error('Personal Information subsection not found');
      }

      // Create nested structure: answers[sectionId][subSectionId][0]
      const answers = {
        [personalDetailsSection._id.toString()]: {
          [personalInfoSubSection._id.toString()]: [
            {
              firstName: firstName,
              middleName: middleName,
              lastName: lastName,
              phone: lead.mobileNumber
            }
          ]
        }
      };

      const profileAnswers = new StudentFormAnswer({
        studentId: newStudent._id,
        partKey: 'PROFILE',
        answers: answers,
        lastSavedAt: new Date()
      });

      await profileAnswers.save();
      console.log('✅ Profile form pre-populated with lead data:', {
        firstName,
        middleName,
        lastName,
        phone: lead.mobileNumber,
        sectionId: personalDetailsSection._id,
        subSectionId: personalInfoSubSection._id
      });
    } catch (formError) {
      console.error("⚠️ Failed to pre-populate form data:", formError);
      // Continue with conversion even if form pre-population fails
    }

    // Update conversion request
    conversion.status = CONVERSION_STATUS.APPROVED;
    conversion.approvedBy = new mongoose.Types.ObjectId(userId);
    conversion.approvedAt = new Date();
    conversion.createdStudentId = newStudent._id as mongoose.Types.ObjectId;
    await conversion.save();
    console.log('✅ Conversion request updated');

    // Update lead
    lead.stage = LEAD_STAGE.CONVERTED;
    lead.conversionStatus = 'APPROVED';
    await lead.save();
    console.log('✅ Lead updated to CONVERTED');

    // Update the latest follow-up status if it's "Scheduled"
    try {
      const latestFollowUp = await FollowUp.findOne({
        leadId: lead._id,
        status: FOLLOWUP_STATUS.SCHEDULED
      }).sort({ scheduledDate: -1, scheduledTime: -1 });

      if (latestFollowUp) {
        latestFollowUp.status = FOLLOWUP_STATUS.CONVERTED_TO_STUDENT;
        latestFollowUp.completedAt = new Date();
        latestFollowUp.updatedBy = new mongoose.Types.ObjectId(userId);
        await latestFollowUp.save();
        console.log('✅ Latest scheduled follow-up updated to CONVERTED_TO_STUDENT:', latestFollowUp._id);
      } else {
        console.log('ℹ️ No scheduled follow-ups found for this lead');
      }
    } catch (followUpError) {
      console.error("⚠️ Failed to update follow-up status:", followUpError);
      // Continue with conversion even if follow-up update fails
    }

    return res.status(200).json({
      success: true,
      message: "Lead successfully converted to student",
      data: {
        student: newStudent,
        user: {
          _id: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email
        }
      }
    });
  } catch (error: any) {
    console.error("❌ Error approving conversion:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve conversion",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Reject conversion request (Admin)
 */
export const rejectConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { conversionId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Get conversion request
    const conversion = await LeadStudentConversion.findById(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: "Conversion request not found"
      });
    }

    if (conversion.status !== CONVERSION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Conversion request is already ${conversion.status.toLowerCase()}`
      });
    }

    // Check admin authorization
    if (userRole === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin || admin._id.toString() !== conversion.adminId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only reject conversions for your organization"
        });
      }
    }

    // Update conversion request
    conversion.status = CONVERSION_STATUS.REJECTED;
    conversion.rejectedBy = new mongoose.Types.ObjectId(userId);
    conversion.rejectedAt = new Date();
    conversion.rejectionReason = reason || "No reason provided";
    await conversion.save();

    // Update lead
    const lead = await Lead.findById(conversion.leadId);
    if (lead) {
      lead.conversionStatus = 'REJECTED';
      lead.conversionRequestId = undefined;
      await lead.save();
    }

    return res.status(200).json({
      success: true,
      message: "Conversion request rejected",
      data: conversion
    });
  } catch (error) {
    console.error("Error rejecting conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject conversion"
    });
  }
};

/**
 * Get conversion history for a lead (Admin/Counselor)
 */
export const getConversionHistory = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;

    const conversions = await LeadStudentConversion.find({ leadId })
      .populate({
        path: 'requestedBy',
        select: 'firstName middleName lastName email'
      })
      .populate({
        path: 'approvedBy',
        select: 'firstName middleName lastName email'
      })
      .populate({
        path: 'rejectedBy',
        select: 'firstName middleName lastName email'
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions
    });
  } catch (error) {
    console.error("Error fetching conversion history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversion history"
    });
  }
};

/**
 * Get all conversions (Super Admin)
 */
export const getAllConversions = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { status } = req.query;

    let query: any = {};
    if (status && Object.values(CONVERSION_STATUS).includes(status as CONVERSION_STATUS)) {
      query.status = status;
    }

    const conversions = await LeadStudentConversion.find(query)
      .populate({
        path: 'leadId',
        select: 'name email mobileNumber city serviceTypes stage'
      })
      .populate({
        path: 'requestedBy',
        select: 'firstName middleName lastName email'
      })
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions
    });
  } catch (error) {
    console.error("Error fetching all conversions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversions"
    });
  }
};
