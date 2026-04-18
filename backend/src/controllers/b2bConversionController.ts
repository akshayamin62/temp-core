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
import { generateOTP } from "../utils/otp";
import { generateSlug, getUniqueSlug } from "./leadController";
import { sendStudentAccountCreatedEmail, sendEmail } from "../utils/email";

// ========================= STEP 1: TO_IN_PROCESS =========================

/**
 * B2B_SALES: Request conversion to "In Process" (Step 1)
 */
export const requestInProcessConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;
    const userId = req.user?.userId;

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

    // Determine target role based on type
    const targetRole = lead.type === B2B_LEAD_TYPE.ADVISOR ? "Advisor" : "Admin";

    const conversionRequest = new B2BConversion({
      b2bLeadId: lead._id,
      step: B2B_CONVERSION_STEP.TO_IN_PROCESS,
      requestedBy: userId,
      targetRole,
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
          subject: `B2B Conversion Request: ${leadName} → In Process`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#7c3aed;">B2B Conversion Request</h2>
            <p>A B2B Sales person has requested to move a lead to "In Process".</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr><td style="padding:6px 0;font-weight:bold;">Lead:</td><td>${leadName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Type:</td><td>${lead.type}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td>${lead.email}</td></tr>
            </table>
            <p>Please log in to approve or reject this conversion.</p>
          </div>`,
          text: `B2B Conversion Request: ${leadName} → In Process. Please log in to approve or reject.`,
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

    // Approve
    conversion.status = B2B_CONVERSION_STATUS.APPROVED;
    conversion.approvedBy = new mongoose.Types.ObjectId(userId);
    conversion.approvedAt = new Date();
    await conversion.save();

    // Update lead stage to In Process
    const lead = await B2BLead.findById(conversion.b2bLeadId);
    if (lead) {
      lead.stage = B2B_LEAD_STAGE.IN_PROCESS;
      lead.conversionStatus = "DOCUMENT_VERIFICATION";
      lead.conversionRequestId = undefined;
      await lead.save();
    }

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

    return res.status(200).json({
      success: true,
      message: "Lead moved to 'Proceed for Documentation' - pending document verification",
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
 * B2B_OPS: Request conversion to Admin/Advisor (Step 2)
 * Includes company details, documents, slug, allowed services
 */
export const requestAdminAdvisorConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { b2bLeadId } = req.params;
    const userId = req.user?.userId;
    const {
      companyName,
      companyAddress,
      enquiryFormSlug,
      allowedServices,
      aadharDocUrl,
      panDocUrl,
    } = req.body;

    // Handle file uploads - prefer uploaded files over URL strings
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const finalAadharDocUrl = files?.aadharDoc?.[0]?.path || aadharDocUrl || undefined;
    const finalPanDocUrl = files?.panDoc?.[0]?.path || panDocUrl || undefined;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const opsProfile = await B2BOps.findOne({ userId });
    if (!opsProfile) {
      return res.status(403).json({
        success: false,
        message: "Only B2B OPS can request Admin/Advisor conversion",
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
        message: "Lead must be in 'In Process' stage for Admin/Advisor conversion",
      });
    }

    // Must be assigned to this OPS
    if (!lead.assignedB2BOpsId || lead.assignedB2BOpsId.toString() !== opsProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only convert leads assigned to you",
      });
    }

    if (lead.conversionStatus === "PENDING") {
      return res.status(400).json({
        success: false,
        message: "A conversion request is already pending for this lead",
      });
    }

    // Validate required fields
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const targetRole = lead.type === B2B_LEAD_TYPE.ADVISOR ? "Advisor" : "Admin";

    // If Advisor, allowedServices is required
    if (targetRole === "Advisor" && (!allowedServices || !Array.isArray(allowedServices) || allowedServices.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Allowed services are required for Advisor conversion",
      });
    }

    // Generate slug
    let finalSlug: string;
    if (enquiryFormSlug) {
      finalSlug = await getUniqueSlug(generateSlug(enquiryFormSlug));
    } else {
      finalSlug = await getUniqueSlug(generateSlug(companyName));
    }

    const conversionRequest = new B2BConversion({
      b2bLeadId: lead._id,
      step: B2B_CONVERSION_STEP.TO_ADMIN_ADVISOR,
      requestedBy: userId,
      targetRole,
      status: B2B_CONVERSION_STATUS.PENDING,
      companyName: companyName.trim(),
      companyAddress: companyAddress?.trim() || undefined,
      enquiryFormSlug: finalSlug,
      allowedServices: targetRole === "Advisor" ? allowedServices : undefined,
      aadharDocUrl: finalAadharDocUrl,
      panDocUrl: finalPanDocUrl,
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
            <h2 style="color:#059669;">B2B Admin/Advisor Conversion Request</h2>
            <p>A B2B OPS person has submitted a conversion request.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr><td style="padding:6px 0;font-weight:bold;">Lead:</td><td>${leadName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Type:</td><td>${lead.type}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Target Role:</td><td>${targetRole}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Company:</td><td>${companyName}</td></tr>
            </table>
            <p>Please log in to review documents and approve or reject this conversion.</p>
          </div>`,
          text: `B2B Conversion Request: ${leadName} → ${targetRole}. Company: ${companyName}. Please log in to approve or reject.`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send conversion notification:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: `Admin/Advisor conversion request submitted. Waiting for Super Admin approval.`,
      data: conversionRequest,
    });
  } catch (error) {
    console.error("Error requesting Admin/Advisor conversion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request conversion",
    });
  }
};

/**
 * SUPER_ADMIN: Approve Admin/Advisor conversion (Step 2)
 * Creates User + Admin/Advisor profile
 */
export const approveAdminAdvisorConversion = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    if (conversion.step !== B2B_CONVERSION_STEP.TO_ADMIN_ADVISOR) {
      return res.status(400).json({
        success: false,
        message: "This is not a Step 2 (To Admin/Advisor) conversion request",
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

    // Check if user with this email already exists
    let existingUser = await User.findOne({ email: lead.email.toLowerCase() });

    if (existingUser) {
      // Check if already has the target role
      if (conversion.targetRole === "Admin") {
        const existingAdmin = await Admin.findOne({ userId: existingUser._id });
        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            message: "An Admin account already exists with this email",
          });
        }
      } else {
        const existingAdvisor = await Advisor.findOne({ userId: existingUser._id });
        if (existingAdvisor) {
          return res.status(400).json({
            success: false,
            message: "An Advisor account already exists with this email",
          });
        }
      }
    }

    // Create user if not exists
    let newUser;
    if (!existingUser) {
      const otp = generateOTP();
      const targetUserRole = conversion.targetRole === "Admin" ? USER_ROLE.ADMIN : USER_ROLE.ADVISOR;

      newUser = new User({
        firstName: lead.firstName,
        middleName: lead.middleName || "",
        lastName: lead.lastName,
        email: lead.email.toLowerCase(),
        role: targetUserRole,
        isVerified: true,
        isActive: true,
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      await newUser.save();
      console.log("✅ User created for B2B conversion:", newUser._id);

      // Send account creation email
      try {
        const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
        const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
        await sendStudentAccountCreatedEmail(lead.email, fullName, loginUrl);
        console.log("✅ Account creation email sent to:", lead.email);
      } catch (emailError) {
        console.error("⚠️ Failed to send account creation email:", emailError);
      }
    } else {
      newUser = existingUser;
      // Update role if needed
      if (conversion.targetRole === "Admin" && newUser.role !== USER_ROLE.ADMIN) {
        newUser.role = USER_ROLE.ADMIN;
        await newUser.save();
      } else if (conversion.targetRole === "Advisor" && newUser.role !== USER_ROLE.ADVISOR) {
        newUser.role = USER_ROLE.ADVISOR;
        await newUser.save();
      }
      console.log("✅ Using existing user for B2B conversion:", newUser._id);
    }

    // Ensure slug is unique (might have been taken since request was made)
    const finalSlug = await getUniqueSlug(conversion.enquiryFormSlug || generateSlug(conversion.companyName || lead.firstName));

    // Create Admin or Advisor profile
    if (conversion.targetRole === "Admin") {
      const newAdmin = new Admin({
        userId: newUser._id,
        email: lead.email.toLowerCase(),
        mobileNumber: lead.mobileNumber || undefined,
        companyName: conversion.companyName!.trim(),
        address: conversion.companyAddress?.trim() || undefined,
        enquiryFormSlug: finalSlug,
      });

      await newAdmin.save();
      conversion.createdAdminId = newAdmin._id as mongoose.Types.ObjectId;
      console.log("✅ Admin profile created:", newAdmin._id);
    } else {
      const newAdvisor = new Advisor({
        userId: newUser._id,
        email: lead.email.toLowerCase(),
        mobileNumber: lead.mobileNumber || undefined,
        companyName: conversion.companyName!.trim(),
        address: conversion.companyAddress?.trim() || undefined,
        enquiryFormSlug: finalSlug,
        allowedServices: conversion.allowedServices || [],
        isActive: true,
      });

      await newAdvisor.save();
      conversion.createdAdvisorId = newAdvisor._id as mongoose.Types.ObjectId;
      console.log("✅ Advisor profile created:", newAdvisor._id);
    }

    // Update conversion
    conversion.status = B2B_CONVERSION_STATUS.APPROVED;
    conversion.approvedBy = new mongoose.Types.ObjectId(userId);
    conversion.approvedAt = new Date();
    conversion.enquiryFormSlug = finalSlug;
    await conversion.save();

    // Update lead
    lead.stage = B2B_LEAD_STAGE.CONVERTED;
    lead.conversionStatus = "APPROVED";
    await lead.save();

    return res.status(200).json({
      success: true,
      message: `B2B Lead successfully converted to ${conversion.targetRole}`,
      data: {
        conversion,
        user: {
          _id: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error approving Admin/Advisor conversion:", error);
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
        select: "firstName middleName lastName email mobileNumber type stage",
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
