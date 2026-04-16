import { Response, Request } from "express";
import { AuthRequest } from "../types/auth";
import Advisor from "../models/Advisor";
import Lead, { LEAD_STAGE, SERVICE_TYPE } from "../models/Lead";
import Student from "../models/Student";
import FollowUp, { FOLLOWUP_STATUS, MEETING_TYPE } from "../models/FollowUp";
import User from "../models/User";
import Parent from "../models/Parent";
import LeadStudentConversion, { CONVERSION_STATUS } from "../models/LeadStudentConversion";
import StudentFormAnswer from "../models/StudentFormAnswer";
import ServicePricing from "../models/ServicePricing";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import { USER_ROLE } from "../types/roles";
import { generateOTP } from "../utils/otp";
import { sendStudentAccountCreatedEmail, sendMeetingScheduledEmail } from "../utils/email";
import { sendWhatsAppRegistrationMessage } from "../utils/whatsapp";
import { createZohoMeeting } from "../utils/zohoMeeting";
import mongoose from "mongoose";

/**
 * Helper: Parse full name
 */
const parseName = (fullName: string): { firstName: string; middleName: string; lastName: string } => {
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) return { firstName: nameParts[0], middleName: "", lastName: "" };
  if (nameParts.length === 2) return { firstName: nameParts[0], middleName: "", lastName: nameParts[1] };
  return { firstName: nameParts[0], middleName: nameParts.slice(1, -1).join(" "), lastName: nameParts[nameParts.length - 1] };
};

/**
 * Helper: Get day bounds
 */
const getDayBounds = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const doTimeSlotsOverlap = (time1: string, duration1: number, time2: string, duration2: number): boolean => {
  const start1 = timeToMinutes(time1);
  const end1 = start1 + duration1;
  const start2 = timeToMinutes(time2);
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
};

// ============= LEAD MANAGEMENT =============

/**
 * ADVISOR: Get all leads
 */
export const getAdvisorLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { stage, serviceTypes, search } = req.query;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const filter: any = { advisorId: advisor._id };

    if (stage) filter.stage = stage;
    if (serviceTypes) filter.serviceTypes = { $in: [serviceTypes] };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 });

    const allLeads = await Lead.find({ advisorId: advisor._id });
    const stats = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length,
      hot: allLeads.filter((l) => l.stage === LEAD_STAGE.HOT).length,
      warm: allLeads.filter((l) => l.stage === LEAD_STAGE.WARM).length,
      cold: allLeads.filter((l) => l.stage === LEAD_STAGE.COLD).length,
      converted: allLeads.filter((l) => l.stage === LEAD_STAGE.CONVERTED).length,
      closed: allLeads.filter((l) => l.stage === LEAD_STAGE.CLOSED).length,
    };

    return res.json({ success: true, data: { leads, stats } });
  } catch (error: any) {
    console.error("Get advisor leads error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

/**
 * ADVISOR: Get single lead detail
 */
export const getAdvisorLeadDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({ success: true, data: { lead } });
  } catch (error: any) {
    console.error("Get advisor lead detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch lead details" });
  }
};

/**
 * ADVISOR: Update lead stage
 */
export const updateAdvisorLeadStage = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;
    const userId = req.user?.userId;

    if (!Object.values(LEAD_STAGE).includes(stage as LEAD_STAGE)) {
      return res.status(400).json({ success: false, message: "Invalid stage" });
    }

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (lead.stage === LEAD_STAGE.CONVERTED && lead.conversionStatus === "APPROVED") {
      return res.status(400).json({ success: false, message: "Cannot change stage. This lead has been converted to a student." });
    }

    if (stage === LEAD_STAGE.CONVERTED) {
      return res.status(400).json({ success: false, message: "Cannot directly change to 'Converted to Student'. Please use the conversion flow." });
    }

    lead.stage = stage as LEAD_STAGE;
    await lead.save();

    return res.json({ success: true, message: "Lead stage updated", data: { lead } });
  } catch (error: any) {
    console.error("Update advisor lead stage error:", error);
    return res.status(500).json({ success: false, message: "Failed to update lead stage" });
  }
};

// ============= FOLLOW-UP MANAGEMENT =============

/**
 * ADVISOR: Create follow-up (Advisor acts as its own counselor)
 */
export const createAdvisorFollowUp = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId, scheduledDate, scheduledTime, duration, meetingType, notes } = req.body;

    if (!leadId || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({ success: false, message: "Lead ID, scheduled date, time, and duration are required" });
    }

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found or not assigned to you" });
    }

    const scheduleDate = new Date(scheduledDate);
    const { start: dayStart, end: dayEnd } = getDayBounds(scheduleDate);

    // Check for time slot conflicts for this advisor
    const existingFollowUps = await FollowUp.find({
      advisorId: advisor._id,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    }).populate("leadId", "name");

    for (const existing of existingFollowUps) {
      if (doTimeSlotsOverlap(scheduledTime, duration, existing.scheduledTime, existing.duration)) {
        const existingLeadName = (existing.leadId as any)?.name || "Unknown Lead";
        return res.status(400).json({
          success: false,
          message: `Time slot conflicts with another follow-up at ${existing.scheduledTime} for ${existingLeadName}`,
        });
      }
    }

    const existingFollowUpsForLead = await FollowUp.countDocuments({ leadId });
    const followUpNumber = existingFollowUpsForLead + 1;

    const initialStatus = lead.stage === LEAD_STAGE.CONVERTED
      ? FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
      : FOLLOWUP_STATUS.SCHEDULED;

    const followUp = new FollowUp({
      leadId,
      advisorId: advisor._id,
      // No counselorId — Advisor does follow-ups directly
      scheduledDate: scheduleDate,
      scheduledTime,
      duration,
      meetingType: meetingType || MEETING_TYPE.ONLINE,
      status: initialStatus,
      stageAtFollowUp: lead.stage,
      followUpNumber,
      notes: notes || "",
      createdBy: userId,
    });

    // Create Zoho meeting if online
    const effectiveMeetingType = meetingType || MEETING_TYPE.ONLINE;
    if (effectiveMeetingType === MEETING_TYPE.ONLINE) {
      try {
        const [hours, mins] = scheduledTime.split(":").map(Number);
        const meetingStartTime = new Date(scheduleDate);
        meetingStartTime.setHours(hours, mins, 0, 0);

        const participantEmails: string[] = [];
        if (lead.email) participantEmails.push(lead.email);
        if (advisor.email) participantEmails.push(advisor.email);

        const zohoResult = await createZohoMeeting({
          topic: `Follow-up #${followUpNumber} - ${lead.name}`,
          startTime: meetingStartTime,
          duration,
          agenda: notes || `Follow-up meeting with ${lead.name}`,
          participantEmails,
        });

        followUp.zohoMeetingKey = zohoResult.meetingKey;
        followUp.zohoMeetingUrl = zohoResult.meetingUrl;
        followUp.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
        followUp.zohoMeetingPassword = zohoResult.meetingPassword || "";
      } catch (zohoError) {
        console.error("Zoho Meeting creation failed for advisor follow-up:", zohoError);
      }
    }

    await followUp.save();
    await followUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");

    // Send email notifications
    const formattedDate = scheduleDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const advisorUser = await User.findById(userId);
    const advisorFullName = advisorUser
      ? [advisorUser.firstName, advisorUser.middleName, advisorUser.lastName].filter(Boolean).join(" ")
      : "Your Advisor";

    const meetingEmailDetails = {
      subject: `Follow-up #${followUpNumber} - ${lead.name}`,
      date: formattedDate,
      time: scheduledTime,
      duration,
      meetingType: effectiveMeetingType,
      meetingUrl: followUp.zohoMeetingUrl || undefined,
      meetingId: followUp.zohoMeetingId || undefined,
      meetingPassword: followUp.zohoMeetingPassword || undefined,
      otherPartyName: "",
      agenda: notes || undefined,
    };

    if (lead.email) {
      sendMeetingScheduledEmail(lead.email, lead.name, {
        ...meetingEmailDetails,
        otherPartyName: advisorFullName,
      }).catch((err) => console.error("Failed to send meeting email to lead:", err));
    }

    return res.status(201).json({
      success: true,
      message: "Follow-up scheduled successfully",
      data: { followUp },
    });
  } catch (error) {
    console.error("Error creating advisor follow-up:", error);
    return res.status(500).json({ success: false, message: "Error creating follow-up" });
  }
};

/**
 * ADVISOR: Get follow-ups
 */
export const getAdvisorFollowUps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate, status } = req.query;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const filter: any = { advisorId: advisor._id };
    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    if (status) filter.status = status;

    const followUps = await FollowUp.find(filter)
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({ success: true, data: { followUps } });
  } catch (error) {
    console.error("Error fetching advisor follow-ups:", error);
    return res.status(500).json({ success: false, message: "Error fetching follow-ups" });
  }
};

/**
 * ADVISOR: Get follow-up summary
 */
export const getAdvisorFollowUpSummary = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start: tomorrowStart, end: tomorrowEnd } = getDayBounds(tomorrow);

    const todayFollowUps = await FollowUp.find({
      advisorId: advisor._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledTime: 1 });

    const missedFollowUps = await FollowUp.find({
      advisorId: advisor._id,
      scheduledDate: { $lt: todayStart },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledDate: -1 });

    const upcomingFollowUps = await FollowUp.find({
      advisorId: advisor._id,
      scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: {
        today: todayFollowUps,
        missed: missedFollowUps,
        upcoming: upcomingFollowUps,
        counts: {
          today: todayFollowUps.length,
          missed: missedFollowUps.length,
          upcoming: upcomingFollowUps.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching advisor follow-up summary:", error);
    return res.status(500).json({ success: false, message: "Error fetching follow-up summary" });
  }
};

/**
 * ADVISOR: Update follow-up
 */
export const updateAdvisorFollowUp = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { followUpId } = req.params;
    const { status, stageChangedTo, notes, nextFollowUp } = req.body;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const followUp = await FollowUp.findOne({ _id: followUpId, advisorId: advisor._id });
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    const totalFollowUpsForLead = await FollowUp.countDocuments({ leadId: followUp.leadId });
    const isLocked = followUp.followUpNumber < totalFollowUpsForLead;

    if (isLocked && nextFollowUp) {
      return res.status(400).json({ success: false, message: "Cannot schedule next follow-up from a locked follow-up." });
    }

    if (status) {
      followUp.status = status;
      if (status !== FOLLOWUP_STATUS.SCHEDULED && !followUp.completedAt) {
        followUp.completedAt = new Date();
      }
    }

    if (notes !== undefined) followUp.notes = notes;
    followUp.updatedBy = new mongoose.Types.ObjectId(userId);

    if (stageChangedTo) {
      followUp.stageChangedTo = stageChangedTo;
      await Lead.findByIdAndUpdate(followUp.leadId, { stage: stageChangedTo });
    }

    await followUp.save();

    let newFollowUp = null;
    if (nextFollowUp && nextFollowUp.scheduledDate && nextFollowUp.scheduledTime) {
      const nextDate = new Date(nextFollowUp.scheduledDate);
      const { start: dayStart, end: dayEnd } = getDayBounds(nextDate);

      const conflicting = await FollowUp.find({
        advisorId: advisor._id,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
      }).populate("leadId", "name");

      for (const existing of conflicting) {
        if (doTimeSlotsOverlap(nextFollowUp.scheduledTime, nextFollowUp.duration || 30, existing.scheduledTime, existing.duration)) {
          const existingLeadName = (existing.leadId as any)?.name || "Unknown Lead";
          return res.status(400).json({
            success: false,
            message: `Next follow-up conflicts with another at ${existing.scheduledTime} for ${existingLeadName}`,
          });
        }
      }

      const lead = await Lead.findById(followUp.leadId);
      const existingCount = await FollowUp.countDocuments({ leadId: followUp.leadId });
      const effectiveStage = stageChangedTo || lead?.stage || followUp.stageAtFollowUp;
      const nextStatus = effectiveStage === LEAD_STAGE.CONVERTED
        ? FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
        : FOLLOWUP_STATUS.SCHEDULED;

      newFollowUp = new FollowUp({
        leadId: followUp.leadId,
        advisorId: advisor._id,
        scheduledDate: nextDate,
        scheduledTime: nextFollowUp.scheduledTime,
        duration: nextFollowUp.duration || 30,
        meetingType: nextFollowUp.meetingType || MEETING_TYPE.ONLINE,
        status: nextStatus,
        stageAtFollowUp: effectiveStage,
        followUpNumber: existingCount + 1,
        notes: "",
        createdBy: userId,
      });

      await newFollowUp.save();
      await newFollowUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");
    }

    await followUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");

    return res.status(200).json({
      success: true,
      message: "Follow-up updated successfully",
      data: { followUp, newFollowUp },
    });
  } catch (error) {
    console.error("Error updating advisor follow-up:", error);
    return res.status(500).json({ success: false, message: "Error updating follow-up" });
  }
};

/**
 * ADVISOR: Get follow-up history for a lead
 */
export const getAdvisorLeadFollowUpHistory = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const followUps = await FollowUp.find({ leadId })
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ createdAt: -1 });

    const activeFollowUp = followUps.find((f) => f.status === FOLLOWUP_STATUS.SCHEDULED);

    return res.status(200).json({
      success: true,
      data: { lead, followUps, hasActiveFollowUp: !!activeFollowUp, activeFollowUp: activeFollowUp || null },
    });
  } catch (error) {
    console.error("Error fetching advisor lead follow-up history:", error);
    return res.status(500).json({ success: false, message: "Error fetching follow-up history" });
  }
};

// ============= LEAD CONVERSION (Advisor self-approves) =============

/**
 * ADVISOR: Convert lead to student directly
 */
export const convertAdvisorLead = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (lead.stage === LEAD_STAGE.CONVERTED) {
      return res.status(400).json({ success: false, message: "Lead is already converted to student" });
    }

    if (lead.conversionStatus === "PENDING") {
      return res.status(400).json({ success: false, message: "Conversion request already pending for this lead" });
    }

    // Check if user with this email already exists
    let existingUser = await User.findOne({ email: lead.email.toLowerCase() });
    if (existingUser) {
      const existingStudent = await Student.findOne({ userId: existingUser._id });
      if (existingStudent) {
        return res.status(400).json({ success: false, message: "A student account already exists with this email" });
      }
    }

    // Create user
    let newUser;
    if (!existingUser) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      const nameParts = (lead.name || "").trim().split(/\s+/);

      newUser = new User({
        firstName: nameParts[0] || "Unknown",
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
        email: lead.email.toLowerCase(),
        role: USER_ROLE.STUDENT,
        isVerified: true,
        isActive: true,
        otp,
        otpExpires: otpExpiry,
      });

      await newUser.save();

      try {
        const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000/";
        await sendStudentAccountCreatedEmail(lead.email, lead.name, loginUrl);
      } catch (emailError) {
        console.error("Failed to send account creation email:", emailError);
      }

      if (lead.mobileNumber) {
        try {
          await sendWhatsAppRegistrationMessage(lead.mobileNumber, lead.name, lead.email);
        } catch (whatsappError) {
          console.error("Failed to send WhatsApp message:", whatsappError);
        }
      }
    } else {
      newUser = existingUser;
    }

    // Create student with advisorId, no adminId
    const newStudent = new Student({
      userId: newUser._id,
      email: lead.email.toLowerCase(),
      mobileNumber: lead.mobileNumber,
      advisorId: advisor._id,
      // adminId is null — student belongs to advisor only
      ...(lead.intake && { intake: lead.intake }),
      ...(lead.year && { year: lead.year }),
      ...(lead.referrerId && { referrerId: lead.referrerId }),
      convertedFromLeadId: lead._id,
      conversionDate: new Date(),
    });

    await newStudent.save();

    // Pre-populate student form with lead data
    const { firstName, middleName, lastName } = parseName(lead.name);
    try {
      const answers: any = {
        personalDetails: {
          personalInformation: [{ firstName, middleName, lastName, phone: lead.mobileNumber }],
        },
      };

      if (lead.parentDetail && lead.parentDetail.firstName) {
        answers.parentalDetails = {
          parentGuardian: [{
            parentFirstName: lead.parentDetail.firstName,
            parentMiddleName: lead.parentDetail.middleName || "",
            parentLastName: lead.parentDetail.lastName,
            parentRelationship: lead.parentDetail.relationship,
            parentMobile: lead.parentDetail.mobileNumber,
            parentEmail: lead.parentDetail.email,
            parentQualification: lead.parentDetail.qualification,
            parentOccupation: lead.parentDetail.occupation,
          }],
        };
      }

      await new StudentFormAnswer({
        studentId: newStudent._id,
        partKey: "PROFILE",
        answers,
        lastSavedAt: new Date(),
      }).save();
    } catch (formError) {
      console.error("Failed to pre-populate form data:", formError);
    }

    // Create parent if parent detail provided
    if (lead.parentDetail && lead.parentDetail.email) {
      try {
        const parentEmail = lead.parentDetail.email.toLowerCase().trim();
        let parentUser = await User.findOne({ email: parentEmail });

        if (!parentUser) {
          parentUser = new User({
            firstName: lead.parentDetail.firstName,
            middleName: lead.parentDetail.middleName || "",
            lastName: lead.parentDetail.lastName,
            email: parentEmail,
            role: USER_ROLE.PARENT,
            isVerified: true,
            isActive: true,
            otp: generateOTP(),
            otpExpires: new Date(Date.now() + 10 * 60 * 1000),
          });
          await parentUser.save();
        }

        let parentDoc = await Parent.findOne({ userId: parentUser._id });
        if (parentDoc) {
          const studentIdStr = (newStudent._id as mongoose.Types.ObjectId).toString();
          if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(studentIdStr)) {
            parentDoc.studentIds.push(newStudent._id as mongoose.Types.ObjectId);
            await parentDoc.save();
          }
        } else {
          await new Parent({
            userId: parentUser._id,
            studentIds: [newStudent._id],
            email: parentEmail,
            relationship: lead.parentDetail.relationship || "parent",
            mobileNumber: lead.parentDetail.mobileNumber,
            qualification: lead.parentDetail.qualification || "",
            occupation: lead.parentDetail.occupation || "",
            convertedFromLeadId: lead._id,
          }).save();
        }
      } catch (parentError) {
        console.error("Failed to create parent:", parentError);
      }
    }

    // Create conversion record
    const conversionRecord = new LeadStudentConversion({
      leadId: lead._id,
      requestedBy: userId,
      advisorId: advisor._id,
      status: CONVERSION_STATUS.APPROVED,
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
      createdStudentId: newStudent._id as mongoose.Types.ObjectId,
    });
    await conversionRecord.save();

    // Update lead
    lead.stage = LEAD_STAGE.CONVERTED;
    lead.conversionStatus = "APPROVED";
    lead.conversionRequestId = conversionRecord._id as mongoose.Types.ObjectId;
    await lead.save();

    // Update latest follow-up
    try {
      const latestFollowUp = await FollowUp.findOne({
        leadId: lead._id,
        status: FOLLOWUP_STATUS.SCHEDULED,
      }).sort({ scheduledDate: -1, scheduledTime: -1 });

      if (latestFollowUp) {
        latestFollowUp.status = FOLLOWUP_STATUS.CONVERTED_TO_STUDENT;
        latestFollowUp.completedAt = new Date();
        latestFollowUp.updatedBy = new mongoose.Types.ObjectId(userId);
        await latestFollowUp.save();
      }
    } catch (followUpError) {
      console.error("Failed to update follow-up status:", followUpError);
    }

    return res.status(200).json({
      success: true,
      message: "Lead successfully converted to student",
      data: {
        student: newStudent,
        user: { _id: newUser._id, firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email },
      },
    });
  } catch (error: any) {
    console.error("Error converting advisor lead:", error);
    return res.status(500).json({ success: false, message: "Failed to convert lead" });
  }
};

// ============= STUDENT MANAGEMENT =============

/**
 * ADVISOR: Get student by lead ID (for converted leads)
 */
export const getAdvisorStudentByLeadId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    // Verify the lead belongs to this advisor
    const lead = await Lead.findOne({ _id: leadId, advisorId: advisor._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const conversion = await LeadStudentConversion.findOne({
      leadId,
      status: "APPROVED",
    });

    if (!conversion || !conversion.createdStudentId) {
      return res.status(404).json({ success: false, message: "No converted student found for this lead" });
    }

    return res.json({
      success: true,
      data: {
        student: { _id: conversion.createdStudentId },
      },
    });
  } catch (error: any) {
    console.error("Get advisor student by lead error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student" });
  }
};

/**
 * ADVISOR: Get students
 */
export const getAdvisorStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { search } = req.query;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const filter: any = { advisorId: advisor._id };
    if (search) {
      // Search by student email or mobile number; or by user name
      const userIds = await User.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      filter.$or = [
        { userId: { $in: userIds.map((u) => u._id) } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter)
      .populate("userId", "firstName middleName lastName email isActive profilePicture")
      .sort({ createdAt: -1 });

    // Mark transferred students (those who now have an adminId)
    const studentsWithTransferFlag = students.map((s: any) => ({
      ...s.toObject(),
      isTransferred: !!s.adminId,
    }));

    return res.json({ success: true, data: { students: studentsWithTransferFlag } });
  } catch (error: any) {
    console.error("Get advisor students error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * ADVISOR: Get single student detail
 */
export const getAdvisorStudentDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, advisorId: advisor._id })
      .populate("userId", "firstName middleName lastName email isActive isVerified profilePicture mobileNumber createdAt")
      .populate({
        path: "adminId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "counselorId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "advisorId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "referrerId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Get service registrations
    const registrations = await StudentServiceRegistration.find({ studentId: student._id })
      .populate("serviceId", "name slug shortDescription icon")
      .populate({
        path: "primaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "secondaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "activeOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "registeredViaAdvisorId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .populate({
        path: "registeredViaAdminId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .lean()
      .exec();

    // Mark each registration: isOwnRegistration = true if registered under this advisor
    const advisorIdStr = advisor._id.toString();
    const registrationsWithAccess = registrations.map((reg: any) => ({
      ...reg,
      isOwnRegistration: reg.registeredViaAdvisorId?._id?.toString() === advisorIdStr
        || reg.registeredViaAdvisorId?.toString() === advisorIdStr,
    }));

    return res.json({ success: true, data: { student, registrations: registrationsWithAccess, isTransferred: !!student.adminId } });
  } catch (error: any) {
    console.error("Get advisor student detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student details" });
  }
};

// ============= PARENTS =============

/**
 * ADVISOR: Get parents of advisor's students
 */
export const getAdvisorParents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const students = await Student.find({ advisorId: advisor._id }).select("_id");
    const studentIds = students.map((s) => s._id);

    const parents = await Parent.find({ studentIds: { $in: studentIds } })
      .populate("userId", "firstName middleName lastName email isActive profilePicture")
      .populate({
        path: "studentIds",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      });

    return res.json({ success: true, data: { parents } });
  } catch (error: any) {
    console.error("Get advisor parents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch parents" });
  }
};

// ============= SERVICE PRICING =============

/**
 * ADVISOR: Get own pricing for a service
 */
export const getAdvisorPricing = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    if (!advisor.allowedServices.includes(serviceSlug)) {
      return res.status(403).json({ success: false, message: "You are not authorized for this service" });
    }

    const pricing = await ServicePricing.findOne({ advisorId: advisor._id, serviceSlug }).lean();

    return res.json({
      success: true,
      data: { pricing: pricing ? pricing.prices : null },
    });
  } catch (error: any) {
    console.error("Get advisor pricing error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pricing" });
  }
};

/**
 * ADVISOR: Set own pricing for a service
 */
export const setAdvisorPricing = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { prices } = req.body;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    if (!advisor.allowedServices.includes(serviceSlug)) {
      return res.status(403).json({ success: false, message: "You are not authorized for this service" });
    }

    if (!prices || typeof prices !== "object" || Array.isArray(prices)) {
      return res.status(400).json({ success: false, message: "Prices object is required" });
    }

    for (const [key, val] of Object.entries(prices)) {
      if (typeof val !== "number" || val < 0) {
        return res.status(400).json({ success: false, message: `Invalid price for ${key}. Must be a non-negative number.` });
      }
    }

    const pricing = await ServicePricing.findOneAndUpdate(
      { advisorId: advisor._id, serviceSlug },
      { advisorId: advisor._id, serviceSlug, prices },
      { upsert: true, new: true, runValidators: true }
    );

    const savedPrices = pricing.prices instanceof Map ? Object.fromEntries(pricing.prices) : pricing.prices;

    return res.json({
      success: true,
      message: "Pricing updated successfully",
      data: { pricing: savedPrices },
    });
  } catch (error: any) {
    console.error("Set advisor pricing error:", error);
    return res.status(500).json({ success: false, message: "Failed to update pricing" });
  }
};

// ============= ENQUIRY FORM URL =============

/**
 * ADVISOR: Get own enquiry form URL
 */
export const getAdvisorEnquiryFormUrl = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    return res.json({
      success: true,
      data: { slug: advisor.enquiryFormSlug },
    });
  } catch (error: any) {
    console.error("Get advisor enquiry form URL error:", error);
    return res.status(500).json({ success: false, message: "Failed to get enquiry form URL" });
  }
};

// ============= DASHBOARD STATS =============

/**
 * ADVISOR: Get dashboard stats
 */
export const getAdvisorDashboardStats = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const [totalLeads, newLeads, convertedLeads, totalStudents] = await Promise.all([
      Lead.countDocuments({ advisorId: advisor._id }),
      Lead.countDocuments({ advisorId: advisor._id, stage: LEAD_STAGE.NEW }),
      Lead.countDocuments({ advisorId: advisor._id, stage: LEAD_STAGE.CONVERTED }),
      Student.countDocuments({ advisorId: advisor._id }),
    ]);

    // Today's follow-ups
    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);
    const todayFollowUps = await FollowUp.countDocuments({
      advisorId: advisor._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    });

    // Missed follow-ups
    const missedFollowUps = await FollowUp.countDocuments({
      advisorId: advisor._id,
      scheduledDate: { $lt: todayStart },
      status: FOLLOWUP_STATUS.SCHEDULED,
    });

    return res.json({
      success: true,
      data: {
        totalLeads,
        newLeads,
        convertedLeads,
        totalStudents,
        todayFollowUps,
        missedFollowUps,
        allowedServices: advisor.allowedServices,
      },
    });
  } catch (error: any) {
    console.error("Get advisor dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
  }
};

/**
 * ADVISOR: Get student form answers for a registration (read-only)
 */
export const getAdvisorStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;
    const userId = req.user?.userId;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, advisorId: advisor._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or access denied" });
    }

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate("serviceId")
      .populate({
        path: "registeredViaAdvisorId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .populate({
        path: "registeredViaAdminId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      });
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const advisorIdStr = advisor._id.toString();
    const isOwnRegistration = (registration as any).registeredViaAdvisorId?._id?.toString() === advisorIdStr
      || (registration as any).registeredViaAdvisorId?.toString() === advisorIdStr;

    // G3 fix: only return form answers for registrations owned by this advisor
    const answers = isOwnRegistration
      ? await StudentFormAnswer.find({ studentId }).lean().exec()
      : [];

    return res.status(200).json({
      success: true,
      message: "Form answers fetched successfully",
      data: { registration, answers, isOwnRegistration },
    });
  } catch (error: any) {
    console.error("Get advisor student form answers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch form answers" });
  }
};
