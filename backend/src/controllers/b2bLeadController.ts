import { Response, Request } from "express";
import { AuthRequest } from "../types/auth";
import B2BLead, { B2B_LEAD_STAGE, B2B_LEAD_TYPE } from "../models/B2BLead";
import B2BSales from "../models/B2BSales";
import B2BOps from "../models/B2BOps";
import { USER_ROLE } from "../types/roles";
import mongoose from "mongoose";
import { sendEmail } from "../utils/email";
import UserModel from "../models/User";

/**
 * PUBLIC: Submit B2B enquiry form (no auth required)
 */
export const submitB2BEnquiry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber, type } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !mobileNumber || !type) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: firstName, lastName, email, mobileNumber, type",
      });
    }

    // Validate type
    if (!Object.values(B2B_LEAD_TYPE).includes(type as B2B_LEAD_TYPE)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${Object.values(B2B_LEAD_TYPE).join(", ")}`,
      });
    }

    // Check for duplicate (same email within last 24 hours)
    const existingLead = await B2BLead.findOne({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an enquiry recently. Please wait 24 hours before submitting again.",
      });
    }

    const newLead = new B2BLead({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      type: type as B2B_LEAD_TYPE,
      stage: B2B_LEAD_STAGE.NEW,
      source: "B2B Enquiry Form",
    });

    await newLead.save();

    // Notify Super Admin via email
    try {
      const superAdmins = await UserModel.find({ role: USER_ROLE.SUPER_ADMIN, isActive: true }).select("email").lean();
      for (const sa of superAdmins) {
        await sendEmail({
          to: sa.email,
          subject: `New B2B Enquiry: ${firstName} ${lastName} (${type})`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#2563eb;">New B2B Partnership Enquiry</h2>
            <p>A new B2B enquiry has been submitted:</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr><td style="padding:6px 0;font-weight:bold;">Name:</td><td>${firstName} ${middleName || ''} ${lastName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td>${email}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Phone:</td><td>${mobileNumber}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold;">Type:</td><td>${type}</td></tr>
            </table>
            <p>Please log in to assign a B2B Sales person to this lead.</p>
          </div>`,
          text: `New B2B Enquiry: ${firstName} ${lastName} (${type}) - Email: ${email} - Phone: ${mobileNumber}`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send B2B enquiry notification email:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Thank you for your enquiry! We will contact you soon.",
    });
  } catch (error: any) {
    console.error("Submit B2B enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry. Please try again later.",
    });
  }
};

/**
 * SUPER_ADMIN: Get all B2B leads with stats
 */
export const getAllB2BLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { stage, type, assigned, search } = req.query;

    const filter: any = {};

    if (stage) {
      filter.stage = stage;
    }

    if (type) {
      filter.type = type;
    }

    if (assigned === "sales") {
      filter.assignedB2BSalesId = { $ne: null };
    } else if (assigned === "ops") {
      filter.assignedB2BOpsId = { $ne: null };
    } else if (assigned === "unassigned") {
      filter.assignedB2BSalesId = null;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await B2BLead.find(filter)
      .populate({
        path: "assignedB2BSalesId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "assignedB2BOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .sort({ createdAt: -1 });

    // Get stats
    const allLeads = await B2BLead.find({});
    const stats = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.NEW).length,
      hot: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.HOT).length,
      warm: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.WARM).length,
      cold: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.COLD).length,
      inProcess: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.IN_PROCESS).length,
      converted: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.CONVERTED).length,
      closed: allLeads.filter((l) => l.stage === B2B_LEAD_STAGE.CLOSED).length,
      unassigned: allLeads.filter((l) => !l.assignedB2BSalesId).length,
      // Type breakdown
      franchise: allLeads.filter((l) => l.type === B2B_LEAD_TYPE.FRANCHISE).length,
      institution: allLeads.filter((l) => l.type === B2B_LEAD_TYPE.INSTITUTION).length,
      advisor: allLeads.filter((l) => l.type === B2B_LEAD_TYPE.ADVISOR).length,
    };

    return res.json({
      success: true,
      data: { leads, stats },
    });
  } catch (error: any) {
    console.error("Get B2B leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch B2B leads",
    });
  }
};

/**
 * SUPER_ADMIN / B2B_SALES / B2B_OPS: Get single B2B lead detail
 */
export const getB2BLeadDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const lead = await B2BLead.findById(leadId)
      .populate({
        path: "assignedB2BSalesId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "assignedB2BOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "conversionRequestId",
        select: "targetRole allowedServices step status",
      })
      .populate({
        path: "createdAdvisorId",
        select: "allowedServices",
      });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "B2B Lead not found",
      });
    }

    // Access check for B2B_SALES
    if (userRole === USER_ROLE.B2B_SALES) {
      const salesProfile = await B2BSales.findOne({ userId });
      if (!salesProfile || !lead.assignedB2BSalesId || lead.assignedB2BSalesId._id.toString() !== salesProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Access check for B2B_OPS
    if (userRole === USER_ROLE.B2B_OPS) {
      const opsProfile = await B2BOps.findOne({ userId });
      if (!opsProfile || !lead.assignedB2BOpsId || lead.assignedB2BOpsId._id.toString() !== opsProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    return res.json({
      success: true,
      data: { lead },
    });
  } catch (error: any) {
    console.error("Get B2B lead detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch B2B lead details",
    });
  }
};

/**
 * SUPER_ADMIN: Assign B2B lead to a B2B Sales person
 */
export const assignB2BSales = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { b2bSalesId } = req.body;

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "B2B Lead not found",
      });
    }

    // If null, unassign
    if (!b2bSalesId) {
      lead.assignedB2BSalesId = undefined;
      await lead.save();
      return res.json({
        success: true,
        message: "B2B Sales unassigned successfully",
        data: { lead },
      });
    }

    // Verify B2B Sales exists
    const salesProfile = await B2BSales.findById(b2bSalesId)
      .populate("userId", "firstName middleName lastName email");
    if (!salesProfile) {
      return res.status(400).json({
        success: false,
        message: "Invalid B2B Sales person",
      });
    }

    lead.assignedB2BSalesId = new mongoose.Types.ObjectId(b2bSalesId);
    await lead.save();

    return res.json({
      success: true,
      message: "B2B Sales assigned successfully",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Assign B2B Sales error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign B2B Sales",
    });
  }
};

/**
 * SUPER_ADMIN: Assign B2B lead to a B2B OPS person (only for In Process leads)
 */
export const assignB2BOps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { b2bOpsId } = req.body;

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "B2B Lead not found",
      });
    }

    // B2B OPS can only be assigned to "In Process" leads
    if (lead.stage !== B2B_LEAD_STAGE.IN_PROCESS) {
      return res.status(400).json({
        success: false,
        message: "B2B OPS can only be assigned to leads in 'In Process' stage",
      });
    }

    // If null, unassign
    if (!b2bOpsId) {
      lead.assignedB2BOpsId = undefined;
      await lead.save();
      return res.json({
        success: true,
        message: "B2B OPS unassigned successfully",
        data: { lead },
      });
    }

    // Verify B2B OPS exists
    const opsProfile = await B2BOps.findById(b2bOpsId)
      .populate("userId", "firstName middleName lastName email");
    if (!opsProfile) {
      return res.status(400).json({
        success: false,
        message: "Invalid B2B OPS person",
      });
    }

    lead.assignedB2BOpsId = new mongoose.Types.ObjectId(b2bOpsId);
    await lead.save();

    return res.json({
      success: true,
      message: "B2B OPS assigned successfully",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Assign B2B OPS error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign B2B OPS",
    });
  }
};

/**
 * SUPER_ADMIN / B2B_SALES: Update B2B lead stage
 */
export const updateB2BLeadStage = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!Object.values(B2B_LEAD_STAGE).includes(stage as B2B_LEAD_STAGE)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "B2B Lead not found",
      });
    }

    // If already converted and approved, lock stage
    if (lead.stage === B2B_LEAD_STAGE.CONVERTED && lead.conversionStatus === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Cannot change stage. This lead has been fully converted.",
      });
    }

    // Block direct change to "In Process" or "Converted" — must use conversion flow
    if (stage === B2B_LEAD_STAGE.IN_PROCESS || stage === B2B_LEAD_STAGE.CONVERTED) {
      return res.status(400).json({
        success: false,
        message: `Cannot directly change to '${stage}'. Please use the conversion request flow.`,
      });
    }

    // Access check for B2B_SALES
    if (userRole === USER_ROLE.B2B_SALES) {
      const salesProfile = await B2BSales.findOne({ userId });
      if (!salesProfile || !lead.assignedB2BSalesId || lead.assignedB2BSalesId.toString() !== salesProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    lead.stage = stage as B2B_LEAD_STAGE;
    await lead.save();

    return res.json({
      success: true,
      message: "B2B Lead stage updated",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Update B2B lead stage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update B2B lead stage",
    });
  }
};

/**
 * B2B_SALES: Get assigned B2B leads
 */
export const getB2BSalesLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { stage, type, search } = req.query;

    const salesProfile = await B2BSales.findOne({ userId });
    if (!salesProfile) {
      return res.status(404).json({
        success: false,
        message: "B2B Sales profile not found",
      });
    }

    const filter: any = { assignedB2BSalesId: salesProfile._id };

    if (stage) filter.stage = stage;
    if (type) filter.type = type;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await B2BLead.find(filter)
      .populate({
        path: "assignedB2BOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .sort({ createdAt: -1 });

    // Stats for this sales person
    const allMyLeads = await B2BLead.find({ assignedB2BSalesId: salesProfile._id });
    const stats = {
      total: allMyLeads.length,
      new: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.NEW).length,
      hot: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.HOT).length,
      warm: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.WARM).length,
      cold: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.COLD).length,
      inProcess: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.IN_PROCESS).length,
      converted: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.CONVERTED).length,
      closed: allMyLeads.filter((l) => l.stage === B2B_LEAD_STAGE.CLOSED).length,
    };

    return res.json({
      success: true,
      data: { leads, stats },
    });
  } catch (error: any) {
    console.error("Get B2B Sales leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

/**
 * B2B_OPS: Get assigned B2B leads (only In Process ones)
 */
export const getB2BOpsLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { search } = req.query;

    const opsProfile = await B2BOps.findOne({ userId });
    if (!opsProfile) {
      return res.status(404).json({
        success: false,
        message: "B2B OPS profile not found",
      });
    }

    const filter: any = { assignedB2BOpsId: opsProfile._id };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await B2BLead.find(filter)
      .populate({
        path: "assignedB2BSalesId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .sort({ createdAt: -1 });

    const stats = {
      total: leads.length,
      inProcess: leads.filter((l) => l.stage === B2B_LEAD_STAGE.IN_PROCESS).length,
      converted: leads.filter((l) => l.stage === B2B_LEAD_STAGE.CONVERTED).length,
    };

    return res.json({
      success: true,
      data: { leads, stats },
    });
  } catch (error: any) {
    console.error("Get B2B OPS leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

/**
 * SUPER_ADMIN: Get all B2B Sales staff (for assignment dropdown)
 */
export const getAllB2BSalesStaff = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const salesStaff = await B2BSales.find()
      .populate("userId", "firstName middleName lastName email");

    return res.json({
      success: true,
      data: { salesStaff },
    });
  } catch (error: any) {
    console.error("Get B2B Sales staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch B2B Sales staff",
    });
  }
};

/**
 * SUPER_ADMIN: Get all B2B OPS staff (for assignment dropdown)
 */
export const getAllB2BOpsStaff = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const opsStaff = await B2BOps.find()
      .populate("userId", "firstName middleName lastName email");

    return res.json({
      success: true,
      data: { opsStaff },
    });
  } catch (error: any) {
    console.error("Get B2B OPS staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch B2B OPS staff",
    });
  }
};
