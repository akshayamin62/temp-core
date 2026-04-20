import { Response } from "express";
import { AuthRequest } from "../types/auth";
import B2BConversion, { B2B_CONVERSION_STEP, B2B_CONVERSION_STATUS } from "../models/B2BConversion";
import B2BLead, { B2B_LEAD_STAGE, B2B_LEAD_TYPE } from "../models/B2BLead";
import B2BSales from "../models/B2BSales";
import B2BOps from "../models/B2BOps";
import B2BFollowUp from "../models/B2BFollowUp";
import User from "../models/User";
import Admin from "../models/Admin";
import Advisor from "../models/Advisor";
import { USER_ROLE } from "../types/roles";
import { FOLLOWUP_STATUS } from "../models/FollowUp";
import mongoose from "mongoose";
import { sendEmail } from "../utils/email";

// ========================= STEP 1: TO_IN_PROCESS =========================

/**
 * B2B_SALES: Request conversion to "In Process" (Step 1)
 * Now accepts targetRole, loginEmail, allowedServices from body
 */
export const requestInProcessConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;
    const userId = req.user?.userId;
    const { targetRole, loginEmail, allowedServices, mobileNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const salesProfile = await B2BSales.findOne({ userId });
    if (!salesProfile) {
      return res.status(403).json({
        success: false,
        message: "Only B2B Sales can request In Process conversion",
      });
    }

    const lead = await B2BLead.findById(b2bLeadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    // Check lead is assigned to this sales person
    if (!lead.assignedB2BSalesId || lead.assignedB2BSalesId.toString() !== salesProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only convert leads assigned to you",
      });
    }

    // Check lead is not already in process or converted
    if (lead.stage === B2B_LEAD_STAGE.IN_PROCESS || lead.stage === B2B_LEAD_STAGE.CONVERTED) {
      return res.status(400).json({
        success: false,
        message: `Lead is already ${lead.stage}`,
      });
    }

    if (lead.conversionStatus === "PENDING") {
      return res.status(400).json({
        success: false,
        message: "A conversion request is already pending for this lead",
      });
    }

    // Validate targetRole
    if (!targetRole || !["Admin", "Advisor"].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: "Target role must be either 'Admin' or 'Advisor'",
      });
    }

    // Validate loginEmail
    if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid login email is required",
      });
    }

    // Check no existing active user with this email
    const existingUser = await User.findOne({ email: loginEmail.toLowerCase(), isActive: true });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // If Advisor, allowedServices is required
    if (targetRole === "Advisor" && (!allowedServices || !Array.isArray(allowedServices) || allowedServices.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Allowed services are required for Advisor conversion",
      });
    }

    const conversionRequest = new B2BConversion({
      b2bLeadId: lead._id,
      step: B2B_CONVERSION_STEP.TO_IN_PROCESS,
      requestedBy: userId,
      targetRole,
      loginEmail: loginEmail.toLowerCase(),
      mobileNumber: mobileNumber || lead.mobileNumber || undefined,
      allowedServices: targetRole === "Advisor" ? allowedServices : undefined,
      status: B2B_CONVERSION_STATUS.PENDING,
    });

    await conversionRequest.save();

    lead.conversionRequestId = conversionRequest._id as mongoose.Types.ObjectId;
    lead.conversionStatus = "PENDING";
    await lead.save();

    // Notify Super Admin
    try {
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN, isActive: true }).select("email").lean();
      const leadName = `${lead.firstName} ${lead.lastName}`;
      for (const sa of superAdmins) {
        await sendEmail({
          to: sa.email,
          subject: `B2B Conversion Request: ${leadName} → ${targetRole}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#7c3aed;">B2B Conversion Request</h2>
            <p>A B2B Sales person has requested to convert a lead to ${targetRole}.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr><td style="padding:6px 0;font-weight:bold;">Lead:</td><td>${leadName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Type:</td><td>${lead.type}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Login Email:</td><td>${loginEmail}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Target Role:</td><td>${targetRole}</td></tr>
            </table>
            <p>Please log in to approve or reject this conversion.</p>
          </div>`,
          text: `B2B Conversion Request: ${leadName} → ${targetRole}. Login Email: ${loginEmail}. Please log in to approve or reject.`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send conversion notification:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "In Process conversion request submitted. Waiting for Super Admin approval.",
      data: conversionRequest,
    });
  } catch (error) {
    console.error("Error requesting In Process conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request conversion",
    });
  }
};

/**
 * SUPER_ADMIN: Approve In Process conversion (Step 1)
 * Now also creates User + Admin/Advisor profile with isOnboarded=false
 */
export const approveInProcessConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { conversionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversion = await B2BConversion.findById(conversionId);
    if (!conversion) {
      return res.status(404).json({ success: false, message: "Conversion request not found" });
    }

    if (conversion.step !== B2B_CONVERSION_STEP.TO_IN_PROCESS) {
      return res.status(400).json({
        success: false,
        message: "This is not a Step 1 (To In Process) conversion request",
      });
    }

    if (conversion.status !== B2B_CONVERSION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Conversion request is already ${conversion.status.toLowerCase()}`,
      });
    }

    const lead = await B2BLead.findById(conversion.b2bLeadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    const loginEmail = conversion.loginEmail?.toLowerCase();
    if (!loginEmail) {
      return res.status(400).json({ success: false, message: "Login email is missing from conversion request" });
    }

    // Check if user with this email already exists
    let existingUser = await User.findOne({ email: loginEmail });
    if (existingUser) {
      const existingProfile = conversion.targetRole === "Admin"
        ? await Admin.findOne({ userId: existingUser._id })
        : await Advisor.findOne({ userId: existingUser._id });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: `An ${conversion.targetRole} account already exists with this email`,
        });
      }
    }

    // Create User if not exists
    let newUser;
    if (!existingUser) {
      const targetUserRole = conversion.targetRole === "Admin" ? USER_ROLE.ADMIN : USER_ROLE.ADVISOR;
      newUser = new User({
        firstName: lead.firstName,
        middleName: lead.middleName || "",
        lastName: lead.lastName,
        email: loginEmail,
        role: targetUserRole,
        isVerified: false,
        isActive: true,
      });
      await newUser.save();
      console.log("✅ User created for B2B conversion:", newUser._id);
    } else {
      newUser = existingUser;
      if (conversion.targetRole === "Admin" && newUser.role !== USER_ROLE.ADMIN) {
        newUser.role = USER_ROLE.ADMIN;
        await newUser.save();
      } else if (conversion.targetRole === "Advisor" && newUser.role !== USER_ROLE.ADVISOR) {
        newUser.role = USER_ROLE.ADVISOR;
        await newUser.save();
      }
    }

    // Create Admin/Advisor profile with isOnboarded=false
    if (conversion.targetRole === "Admin") {
      const newAdmin = new Admin({
        userId: newUser._id,
        email: loginEmail,
        mobileNumber: conversion.mobileNumber || lead.mobileNumber || undefined,
        isOnboarded: false,
        b2bLeadId: lead._id,
        assignedB2BOpsId: lead.assignedB2BOpsId || undefined,
      });
      await newAdmin.save();
      conversion.createdAdminId = newAdmin._id as mongoose.Types.ObjectId;
      lead.createdAdminId = newAdmin._id as mongoose.Types.ObjectId;
      console.log("✅ Admin profile created (onboarding pending):", newAdmin._id);
    } else {
      const newAdvisor = new Advisor({
        userId: newUser._id,
        email: loginEmail,
        mobileNumber: conversion.mobileNumber || lead.mobileNumber || undefined,
        allowedServices: conversion.allowedServices || [],
        isActive: true,
        isOnboarded: false,
        b2bLeadId: lead._id,
        assignedB2BOpsId: lead.assignedB2BOpsId || undefined,
      });
      await newAdvisor.save();
      conversion.createdAdvisorId = newAdvisor._id as mongoose.Types.ObjectId;
      lead.createdAdvisorId = newAdvisor._id as mongoose.Types.ObjectId;
      console.log("✅ Advisor profile created (onboarding pending):", newAdvisor._id);
    }

    // Approve conversion
    conversion.status = B2B_CONVERSION_STATUS.APPROVED;
    conversion.approvedBy = new mongoose.Types.ObjectId(userId);
    conversion.approvedAt = new Date();
    await conversion.save();

    // Update lead stage to In Process
    lead.stage = B2B_LEAD_STAGE.IN_PROCESS;
    lead.conversionStatus = "DOCUMENT_VERIFICATION";
    lead.conversionRequestId = undefined;
    await lead.save();

    // Update latest scheduled follow-up
    try {
      const latestFollowUp = await B2BFollowUp.findOne({
        b2bLeadId: conversion.b2bLeadId,
        status: FOLLOWUP_STATUS.SCHEDULED,
      }).sort({ scheduledDate: -1, scheduledTime: -1 });

      if (latestFollowUp) {
        latestFollowUp.stageChangedTo = B2B_LEAD_STAGE.IN_PROCESS;
        latestFollowUp.updatedBy = new mongoose.Types.ObjectId(userId);
        await latestFollowUp.save();
      }
    } catch (followUpError) {
      console.error("⚠️ Failed to update follow-up stage:", followUpError);
    }

    // Send welcome email to the new Admin/Advisor
    try {
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
      const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
      await sendEmail({
        to: loginEmail,
        subject: `Welcome to Kareer Studio - Complete Your ${conversion.targetRole} Onboarding`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#7c3aed;">Welcome to Kareer Studio!</h2>
          <p>Hello ${fullName},</p>
          <p>Your ${conversion.targetRole} account has been created. Please log in to complete your onboarding.</p>
          <p><strong>Login Email:</strong> ${loginEmail}</p>
          <p>You will receive an OTP at this email when you log in.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:15px 0;">Log In Now</a>
          <p>After logging in, you'll be guided through an onboarding process to complete your profile and upload required documents.</p>
        </div>`,
        text: `Welcome to Kareer Studio! Your ${conversion.targetRole} account has been created with email: ${loginEmail}. Please log in at ${loginUrl} to complete your onboarding.`,
      });
      console.log("✅ Welcome email sent to:", loginEmail);
    } catch (emailError) {
      console.error("⚠️ Failed to send welcome email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: `Lead approved. ${conversion.targetRole} account created with onboarding pending.`,
      data: { conversion, lead },
    });
  } catch (error) {
    console.error("Error approving In Process conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve conversion",
    });
  }
};

// ========================= STEP 2: TO_ADMIN_ADVISOR =========================

/**
 * B2B_OPS: Request final approval (Step 2)
 * OPS no longer fills form — just triggers final approval after reviewing onboarding docs
 */
export const requestAdminAdvisorConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const opsProfile = await B2BOps.findOne({ userId });
    if (!opsProfile) {
      return res.status(403).json({
        success: false,
        message: "Only B2B OPS can request final approval",
      });
    }

    const lead = await B2BLead.findById(b2bLeadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    // Must be In Process
    if (lead.stage !== B2B_LEAD_STAGE.IN_PROCESS) {
      return res.status(400).json({
        success: false,
        message: "Lead must be in 'In Process' stage for final approval",
      });
    }

    if (lead.conversionStatus === "PENDING") {
      return res.status(400).json({
        success: false,
        message: "A conversion request is already pending for this lead",
      });
    }

    // Find the Admin/Advisor profile linked to this lead
    const targetRole = lead.type === B2B_LEAD_TYPE.ADVISOR ? "Advisor" : "Admin";
    let profile: any = null;

    if (lead.createdAdminId) {
      profile = await Admin.findById(lead.createdAdminId);
    } else if (lead.createdAdvisorId) {
      profile = await Advisor.findById(lead.createdAdvisorId);
    }

    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "No Admin/Advisor account found for this lead. Step 1 approval may be pending.",
      });
    }

    // Check OPS is assigned to this lead or profile
    const isAssignedToProfile = profile.assignedB2BOpsId && profile.assignedB2BOpsId.toString() === opsProfile._id.toString();
    const isAssignedToLead = lead.assignedB2BOpsId && lead.assignedB2BOpsId.toString() === opsProfile._id.toString();
    if (!isAssignedToProfile && !isAssignedToLead) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this Admin/Advisor account",
      });
    }

    // Check all documents are approved
    const pendingOrRejectedDocs = profile.documents?.filter(
      (doc: any) => doc.status !== "APPROVED"
    );
    if (pendingOrRejectedDocs && pendingOrRejectedDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All documents must be approved before requesting final approval",
      });
    }

    const conversionRequest = new B2BConversion({
      b2bLeadId: lead._id,
      step: B2B_CONVERSION_STEP.TO_ADMIN_ADVISOR,
      requestedBy: userId,
      targetRole: lead.createdAdvisorId ? "Advisor" : "Admin",
      status: B2B_CONVERSION_STATUS.PENDING,
    });

    await conversionRequest.save();

    lead.conversionRequestId = conversionRequest._id as mongoose.Types.ObjectId;
    lead.conversionStatus = "PENDING";
    await lead.save();

    // Notify Super Admin
    try {
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN, isActive: true }).select("email").lean();
      const leadName = `${lead.firstName} ${lead.lastName}`;
      for (const sa of superAdmins) {
        await sendEmail({
          to: sa.email,
          subject: `B2B Final Approval: ${leadName} → ${conversionRequest.targetRole}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#059669;">B2B Final Approval Request</h2>
            <p>B2B OPS has reviewed the onboarding and is requesting final approval.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr><td style="padding:6px 0;font-weight:bold;">Lead:</td><td>${leadName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Target Role:</td><td>${conversionRequest.targetRole}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Company:</td><td>${profile.companyName || "N/A"}</td></tr>
            </table>
            <p>Please log in to approve or reject.</p>
          </div>`,
          text: `B2B Final Approval Request: ${leadName} → ${conversionRequest.targetRole}. Please log in to approve or reject.`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send conversion notification:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Final approval request submitted. Waiting for Super Admin approval.",
      data: conversionRequest,
    });
  } catch (error) {
    console.error("Error requesting final approval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request final approval",
    });
  }
};

/**
 * SUPER_ADMIN: Approve final conversion (Step 2)
 * Account already exists. Just sets isOnboarded=true and converts the lead.
 */
export const approveAdminAdvisorConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { conversionId } = req.params;
    const userId = req.user?.userId;
    const { enquiryFormSlug } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversion = await B2BConversion.findById(conversionId);
    if (!conversion) {
      return res.status(404).json({ success: false, message: "Conversion request not found" });
    }

    if (conversion.step !== B2B_CONVERSION_STEP.TO_ADMIN_ADVISOR) {
      return res.status(400).json({
        success: false,
        message: "This is not a Step 2 (Final Approval) conversion request",
      });
    }

    if (conversion.status !== B2B_CONVERSION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Conversion request is already ${conversion.status.toLowerCase()}`,
      });
    }

    const lead = await B2BLead.findById(conversion.b2bLeadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    // Find the existing Admin/Advisor profile and set isOnboarded=true
    let profileEmail = "";
    let profileUserId: mongoose.Types.ObjectId | null = null;
    if (conversion.targetRole === "Admin" && lead.createdAdminId) {
      const admin = await Admin.findById(lead.createdAdminId);
      if (!admin) {
        return res.status(404).json({ success: false, message: "Admin profile not found" });
      }
      admin.isOnboarded = true;
      if (enquiryFormSlug) {
        admin.enquiryFormSlug = enquiryFormSlug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      await admin.save();
      profileEmail = admin.email;
      profileUserId = admin.userId as mongoose.Types.ObjectId;
      conversion.createdAdminId = admin._id as mongoose.Types.ObjectId;
      console.log("✅ Admin onboarding completed:", admin._id);
    } else if (conversion.targetRole === "Advisor" && lead.createdAdvisorId) {
      const advisor = await Advisor.findById(lead.createdAdvisorId);
      if (!advisor) {
        return res.status(404).json({ success: false, message: "Advisor profile not found" });
      }
      advisor.isOnboarded = true;
      if (enquiryFormSlug) {
        advisor.enquiryFormSlug = enquiryFormSlug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      await advisor.save();
      profileEmail = advisor.email;
      profileUserId = advisor.userId as mongoose.Types.ObjectId;
      conversion.createdAdvisorId = advisor._id as mongoose.Types.ObjectId;
      console.log("✅ Advisor onboarding completed:", advisor._id);
    } else {
      return res.status(400).json({
        success: false,
        message: "No linked Admin/Advisor profile found on this lead",
      });
    }

    // Set isVerified on the User model
    if (profileUserId) {
      await User.findByIdAndUpdate(profileUserId, { isVerified: true });
      console.log("✅ User isVerified set to true:", profileUserId);
    }

    // Update conversion
    conversion.status = B2B_CONVERSION_STATUS.APPROVED;
    conversion.approvedBy = new mongoose.Types.ObjectId(userId);
    conversion.approvedAt = new Date();
    await conversion.save();

    // Update lead to Converted
    lead.stage = B2B_LEAD_STAGE.CONVERTED;
    lead.conversionStatus = "APPROVED";
    lead.conversionRequestId = undefined;
    await lead.save();

    // Send full-access email
    try {
      const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
      await sendEmail({
        to: profileEmail,
        subject: `Kareer Studio - Your ${conversion.targetRole} Account is Now Fully Active`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#059669;">Your Account is Fully Active!</h2>
          <p>Hello ${fullName},</p>
          <p>Congratulations! Your onboarding has been approved and your ${conversion.targetRole} account now has full access.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:15px 0;">Access Your Dashboard</a>
        </div>`,
        text: `Your ${conversion.targetRole} account is now fully active. Log in at ${loginUrl} to access your dashboard.`,
      });
    } catch (emailError) {
      console.error("⚠️ Failed to send full-access email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: `B2B Lead successfully converted to ${conversion.targetRole} with full access`,
      data: { conversion, lead },
    });
  } catch (error: any) {
    console.error("❌ Error approving final conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve conversion",
    });
  }
};

// ========================= SHARED =========================

/**
 * SUPER_ADMIN: Reject any conversion request (Step 1 or Step 2)
 */
export const rejectB2BConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { conversionId } = req.params;
    const { reason, rejectionReason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversion = await B2BConversion.findById(conversionId);
    if (!conversion) {
      return res.status(404).json({ success: false, message: "Conversion request not found" });
    }

    if (conversion.status !== B2B_CONVERSION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Conversion request is already ${conversion.status.toLowerCase()}`,
      });
    }

    conversion.status = B2B_CONVERSION_STATUS.REJECTED;
    conversion.rejectedBy = new mongoose.Types.ObjectId(userId);
    conversion.rejectedAt = new Date();
    conversion.rejectionReason = rejectionReason || reason || "No reason provided";
    await conversion.save();

    // Update lead
    const lead = await B2BLead.findById(conversion.b2bLeadId);
    if (lead) {
      lead.conversionStatus = "REJECTED";
      lead.conversionRequestId = undefined;
      await lead.save();
    }

    return res.status(200).json({
      success: true,
      message: "Conversion request rejected",
      data: conversion,
    });
  } catch (error) {
    console.error("Error rejecting B2B conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject conversion",
    });
  }
};

/**
 * Get pending B2B conversions (SUPER_ADMIN)
 */
export const getPendingB2BConversions = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { step } = req.query;

    const query: any = { status: B2B_CONVERSION_STATUS.PENDING };
    if (step) query.step = step;

    const conversions = await B2BConversion.find(query)
      .populate({
        path: "b2bLeadId",
        select: "firstName middleName lastName email mobileNumber type stage createdAdvisorId createdAdminId",
        populate: [
          { path: "createdAdvisorId", select: "companyName allowedServices" },
          { path: "createdAdminId", select: "companyName" },
        ],
      })
      .populate({
        path: "requestedBy",
        select: "firstName middleName lastName email",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions,
    });
  } catch (error) {
    console.error("Error fetching pending B2B conversions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending conversions",
    });
  }
};

/**
 * Get conversion history for a B2B lead
 */
export const getB2BConversionHistory = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;

    const conversions = await B2BConversion.find({ b2bLeadId })
      .populate({ path: "requestedBy", select: "firstName middleName lastName email" })
      .populate({ path: "approvedBy", select: "firstName middleName lastName email" })
      .populate({ path: "rejectedBy", select: "firstName middleName lastName email" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions,
    });
  } catch (error) {
    console.error("Error fetching B2B conversion history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversion history",
    });
  }
};

/**
 * Get all B2B conversions (SUPER_ADMIN)
 */
export const getAllB2BConversions = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { status, step } = req.query;

    const query: any = {};
    if (status && Object.values(B2B_CONVERSION_STATUS).includes(status as B2B_CONVERSION_STATUS)) {
      query.status = status;
    }
    if (step && Object.values(B2B_CONVERSION_STEP).includes(step as B2B_CONVERSION_STEP)) {
      query.step = step;
    }

    const conversions = await B2BConversion.find(query)
      .populate({
        path: "b2bLeadId",
        select: "firstName middleName lastName email mobileNumber type stage",
      })
      .populate({ path: "requestedBy", select: "firstName middleName lastName email" })
      .populate({ path: "approvedBy", select: "firstName middleName lastName email" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: conversions,
    });
  } catch (error) {
    console.error("Error fetching all B2B conversions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversions",
    });
  }
};

/**
 * POST /b2b/conversions/direct-convert/:b2bLeadId
 * B2B OPS directly converts an Admin/Advisor (bypasses Super Admin approval step)
 */
export const directConvertAdminAdvisor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const opsProfile = await B2BOps.findOne({ userId });
    if (!opsProfile) {
      return res.status(403).json({ success: false, message: "Only B2B OPS can perform direct conversion" });
    }

    const lead = await B2BLead.findById(b2bLeadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    if (lead.stage !== B2B_LEAD_STAGE.IN_PROCESS) {
      return res.status(400).json({ success: false, message: "Lead must be in 'In Process' stage" });
    }

    if (lead.conversionStatus === "PENDING") {
      return res.status(400).json({ success: false, message: "A conversion request is already pending" });
    }

    // Find profile
    let profile: any = null;
    let profileEmail = "";
    const targetRole = lead.createdAdvisorId ? "Advisor" : "Admin";

    if (lead.createdAdminId) {
      profile = await Admin.findById(lead.createdAdminId);
    } else if (lead.createdAdvisorId) {
      profile = await Advisor.findById(lead.createdAdvisorId);
    }

    if (!profile) {
      return res.status(400).json({ success: false, message: "No Admin/Advisor account found for this lead" });
    }

    // Verify OPS is assigned
    if (!profile.assignedB2BOpsId || profile.assignedB2BOpsId.toString() !== opsProfile._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not assigned to this account" });
    }

    // Check all uploaded documents are approved
    const unapprovedDocs = profile.documents?.filter((doc: any) => doc.status !== "APPROVED");
    if (unapprovedDocs && unapprovedDocs.length > 0) {
      return res.status(400).json({ success: false, message: "All uploaded documents must be approved before conversion" });
    }

    // Direct conversion: set isOnboarded = true
    profile.isOnboarded = true;
    if (!profile.onboardingSubmittedAt) {
      profile.onboardingSubmittedAt = new Date();
    }
    await profile.save();
    profileEmail = profile.email;

    // Create conversion record as auto-approved
    const conversion = new B2BConversion({
      b2bLeadId: lead._id,
      step: B2B_CONVERSION_STEP.TO_ADMIN_ADVISOR,
      requestedBy: userId,
      targetRole,
      status: B2B_CONVERSION_STATUS.APPROVED,
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
    });
    if (targetRole === "Admin") {
      conversion.createdAdminId = profile._id;
    } else {
      conversion.createdAdvisorId = profile._id;
    }
    await conversion.save();

    // Update lead
    lead.stage = B2B_LEAD_STAGE.CONVERTED;
    lead.conversionStatus = "APPROVED";
    lead.conversionRequestId = undefined;
    await lead.save();

    // Send activation email
    try {
      const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
      await sendEmail({
        to: profileEmail,
        subject: `Kareer Studio - Your ${targetRole} Account is Now Fully Active`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#059669;">Your Account is Fully Active!</h2>
          <p>Hello ${fullName},</p>
          <p>Congratulations! Your ${targetRole} account now has full access.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:15px 0;">Access Your Dashboard</a>
        </div>`,
        text: `Your ${targetRole} account is now fully active. Log in at ${loginUrl} to access your dashboard.`,
      });
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: `Lead successfully converted to ${targetRole} with full access`,
      data: { conversion, lead },
    });
  } catch (error) {
    console.error("Error in direct conversion:", error);
    return res.status(500).json({ success: false, message: "Failed to convert" });
  }
};
