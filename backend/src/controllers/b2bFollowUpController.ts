import { Response } from "express";
import { AuthRequest } from "../types/auth";
import B2BFollowUp from "../models/B2BFollowUp";
import B2BLead, { B2B_LEAD_STAGE } from "../models/B2BLead";
import B2BSales from "../models/B2BSales";
import B2BOps from "../models/B2BOps";
import { FOLLOWUP_STATUS, MEETING_TYPE } from "../models/FollowUp";
import { USER_ROLE } from "../types/roles";
import mongoose from "mongoose";
import { createZohoMeeting } from "../utils/zohoMeeting";
import { sendMeetingScheduledEmail } from "../utils/email";

/**
 * Helper: Get the B2B profile (Sales or Ops) for the current user
 */
const getB2BProfile = async (userId: string, role?: string) => {
  if (role === USER_ROLE.B2B_OPS) {
    return B2BOps.findOne({ userId });
  }
  return B2BSales.findOne({ userId });
};

/**
 * Helper: Get the model class based on role
 */
const getB2BModel = (role?: string) => {
  return role === USER_ROLE.B2B_OPS ? B2BOps : B2BSales;
};

/**
 * Helper: Get start and end of a day
 */
const getDayBounds = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Helper: Convert time string to minutes for comparison
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Helper: Check if two time slots overlap
 */
const doTimeSlotsOverlap = (
  time1: string,
  duration1: number,
  time2: string,
  duration2: number
): boolean => {
  const start1 = timeToMinutes(time1);
  const end1 = start1 + duration1;
  const start2 = timeToMinutes(time2);
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
};

/**
 * B2B_SALES / B2B_OPS: Create a new follow-up for a B2B lead
 */
export const createB2BFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { b2bLeadId, scheduledDate, scheduledTime, duration, meetingType, notes } = req.body;

    if (!b2bLeadId || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({
        success: false,
        message: "B2B Lead ID, scheduled date, time, and duration are required",
      });
    }

    // Find B2B profile (Sales or Ops)
    const profile = await getB2BProfile(userId!, userRole);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "B2B profile not found",
      });
    }

    // Validate lead exists and is assigned to this person
    const leadFilter: any = { _id: b2bLeadId };
    if (userRole === USER_ROLE.B2B_OPS) {
      leadFilter.assignedB2BOpsId = profile._id;
    } else {
      leadFilter.assignedB2BSalesId = profile._id;
    }
    const lead = await B2BLead.findOne(leadFilter);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "B2B Lead not found or not assigned to you",
      });
    }

    const scheduleDate = new Date(scheduledDate);
    const { start: dayStart, end: dayEnd } = getDayBounds(scheduleDate);

    // Check for time slot conflicts
    const existingFollowUps = await B2BFollowUp.find({
      b2bSalesId: profile._id,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    }).populate("b2bLeadId", "firstName lastName");

    for (const existing of existingFollowUps) {
      if (
        doTimeSlotsOverlap(
          scheduledTime,
          duration,
          existing.scheduledTime,
          existing.duration
        )
      ) {
        const existingLeadName = `${(existing.b2bLeadId as any)?.firstName || ""} ${(existing.b2bLeadId as any)?.lastName || ""}`.trim() || "Unknown Lead";
        return res.status(400).json({
          success: false,
          message: `Time slot conflicts with another follow-up scheduled at ${existing.scheduledTime} for ${existingLeadName}`,
        });
      }
    }

    // Count existing follow-ups for this lead
    const existingFollowUpsForLead = await B2BFollowUp.countDocuments({ b2bLeadId: b2bLeadId });
    const followUpNumber = existingFollowUpsForLead + 1;

    const initialStatus =
      lead.stage === B2B_LEAD_STAGE.CONVERTED
        ? FOLLOWUP_STATUS.CONVERTED
        : FOLLOWUP_STATUS.SCHEDULED;

    const followUp = new B2BFollowUp({
      b2bLeadId,
      b2bSalesId: profile._id,
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

    // If online meeting, create Zoho Meeting
    const effectiveMeetingType = meetingType || MEETING_TYPE.ONLINE;
    if (effectiveMeetingType === MEETING_TYPE.ONLINE) {
      try {
        const [hours, mins] = scheduledTime.split(":").map(Number);
        const meetingStartTime = new Date(scheduleDate);
        meetingStartTime.setHours(hours, mins, 0, 0);

        const participantEmails: string[] = [];
        if (lead.email) participantEmails.push(lead.email);

        const staffForZoho = await getB2BModel(userRole).findById(profile._id).populate("userId", "email");
        const staffEmail = (staffForZoho?.userId as any)?.email;
        if (staffEmail) participantEmails.push(staffEmail);

        const leadFullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
        const zohoResult = await createZohoMeeting({
          topic: `B2B Follow-up #${followUpNumber} - ${leadFullName}`,
          startTime: meetingStartTime,
          duration,
          agenda: notes || `B2B Follow-up meeting with ${leadFullName}`,
          participantEmails,
        });

        followUp.zohoMeetingKey = zohoResult.meetingKey;
        followUp.zohoMeetingUrl = zohoResult.meetingUrl;
        followUp.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
        followUp.zohoMeetingPassword = zohoResult.meetingPassword || "";
      } catch (zohoError) {
        console.error("⚠️  Zoho Meeting creation failed for B2B follow-up:", zohoError);
      }
    }

    await followUp.save();
    await followUp.populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage");

    // Send email notifications (non-blocking)
    const leadFullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
    const formattedDate = scheduleDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const meetingEmailDetails = {
      subject: `B2B Follow-up #${followUpNumber} - ${leadFullName}`,
      date: formattedDate,
      time: scheduledTime,
      duration,
      meetingType: effectiveMeetingType,
      meetingUrl: followUp.zohoMeetingUrl || undefined,
      meetingId: followUp.zohoMeetingId || undefined,
      meetingPassword: followUp.zohoMeetingPassword || undefined,
      otherPartyName: "",
    };

    // Get staff person info
    const staffForEmail = await getB2BModel(userRole).findById(profile._id).populate("userId", "email firstName middleName lastName");
    const staffUser = staffForEmail?.userId as any;
    const staffFullName = staffUser
      ? [staffUser.firstName, staffUser.middleName, staffUser.lastName].filter(Boolean).join(" ")
      : "B2B Staff";

    // Email to lead
    if (lead.email) {
      sendMeetingScheduledEmail(lead.email, leadFullName, {
        ...meetingEmailDetails,
        otherPartyName: staffFullName,
      }).catch((err) => console.error("Failed to send B2B meeting email to lead:", err));
    }

    // Email to staff person
    if (staffUser?.email) {
      sendMeetingScheduledEmail(staffUser.email, staffFullName, {
        ...meetingEmailDetails,
        otherPartyName: leadFullName,
      }).catch((err) => console.error("Failed to send B2B meeting email to staff:", err));
    }

    return res.status(201).json({
      success: true,
      message: "B2B Follow-up scheduled successfully",
      data: { followUp },
    });
  } catch (error) {
    console.error("Error creating B2B follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating B2B follow-up",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS: Get all follow-ups (calendar data)
 */
export const getB2BSalesFollowUps = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { startDate, endDate, status } = req.query;

    const profile = await getB2BProfile(userId!, userRole);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "B2B profile not found",
      });
    }

    const filter: any = { b2bSalesId: profile._id };

    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (status) filter.status = status;

    const followUps = await B2BFollowUp.find(filter)
      .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { followUps },
    });
  } catch (error) {
    console.error("Error fetching B2B follow-ups:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching B2B follow-ups",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS: Get follow-up summary (Today, Missed, Upcoming)
 */
export const getB2BFollowUpSummary = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const profile = await getB2BProfile(userId!, userRole);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "B2B profile not found",
      });
    }

    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start: tomorrowStart, end: tomorrowEnd } = getDayBounds(tomorrow);

    const todayFollowUps = await B2BFollowUp.find({
      b2bSalesId: profile._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
      .sort({ scheduledTime: 1 });

    const missedFollowUps = await B2BFollowUp.find({
      b2bSalesId: profile._id,
      scheduledDate: { $lt: todayStart },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
      .sort({ scheduledDate: -1 });

    const upcomingFollowUps = await B2BFollowUp.find({
      b2bSalesId: profile._id,
      scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
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
    console.error("Error fetching B2B follow-up summary:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching B2B follow-up summary",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS / SUPER_ADMIN: Get follow-up by ID
 */
export const getB2BFollowUpById = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { followUpId } = req.params;

    let followUp;

    if (userRole === USER_ROLE.SUPER_ADMIN) {
      followUp = await B2BFollowUp.findById(followUpId)
        .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage");
    } else {
      const profile = await getB2BProfile(userId!, userRole);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "B2B profile not found",
        });
      }

      if (userRole === USER_ROLE.B2B_OPS) {
        // OPS can view follow-ups for leads assigned to them
        followUp = await B2BFollowUp.findById(followUpId)
          .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage assignedB2BOpsId");
        if (followUp) {
          const lead = followUp.b2bLeadId as any;
          if (!lead || String(lead.assignedB2BOpsId) !== String(profile._id)) {
            followUp = null;
          }
        }
      } else {
        followUp = await B2BFollowUp.findOne({
          _id: followUpId,
          b2bSalesId: profile._id,
        }).populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage");
      }
    }

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "B2B Follow-up not found",
      });
    }

    const totalFollowUpsForLead = await B2BFollowUp.countDocuments({ b2bLeadId: followUp.b2bLeadId });

    let nextFollowUpInfo = null;
    if (followUp.followUpNumber < totalFollowUpsForLead) {
      const nextFollowUp = await B2BFollowUp.findOne({
        b2bLeadId: followUp.b2bLeadId,
        followUpNumber: followUp.followUpNumber + 1,
      }).select("scheduledDate scheduledTime duration followUpNumber meetingType");

      if (nextFollowUp) {
        nextFollowUpInfo = {
          scheduledDate: nextFollowUp.scheduledDate,
          scheduledTime: nextFollowUp.scheduledTime,
          duration: nextFollowUp.duration,
          followUpNumber: nextFollowUp.followUpNumber,
          meetingType: nextFollowUp.meetingType,
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: { followUp, totalFollowUpsForLead, nextFollowUpInfo },
    });
  } catch (error) {
    console.error("Error fetching B2B follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching B2B follow-up",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS: Update follow-up (complete/reschedule)
 */
export const updateB2BFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { followUpId } = req.params;
    const { status, stageChangedTo, notes, nextFollowUp } = req.body;

    const profile = await getB2BProfile(userId!, userRole);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "B2B profile not found",
      });
    }

    let followUp;
    if (userRole === USER_ROLE.B2B_OPS) {
      // OPS can update follow-ups for leads assigned to them
      const tempFollowUp = await B2BFollowUp.findById(followUpId).populate("b2bLeadId", "assignedB2BOpsId");
      if (tempFollowUp) {
        const lead = tempFollowUp.b2bLeadId as any;
        if (lead && String(lead.assignedB2BOpsId) === String(profile._id)) {
          followUp = await B2BFollowUp.findById(followUpId);
        }
      }
    } else {
      followUp = await B2BFollowUp.findOne({
        _id: followUpId,
        b2bSalesId: profile._id,
      });
    }

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "B2B Follow-up not found",
      });
    }

    // Check if locked
    const totalFollowUpsForLead = await B2BFollowUp.countDocuments({ b2bLeadId: followUp.b2bLeadId });
    const isLocked = followUp.followUpNumber < totalFollowUpsForLead;

    if (isLocked && nextFollowUp) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule next follow-up from a locked follow-up. Only the latest follow-up can schedule next.",
      });
    }

    if (status) {
      followUp.status = status;
      if (status !== FOLLOWUP_STATUS.SCHEDULED && !followUp.completedAt) {
        followUp.completedAt = new Date();
      }
    }

    if (notes !== undefined) {
      followUp.notes = notes;
    }

    followUp.updatedBy = new mongoose.Types.ObjectId(userId);

    // If stage changed, update follow-up and lead
    if (stageChangedTo) {
      // Block In Process and Converted — must use conversion flow
      if (stageChangedTo === B2B_LEAD_STAGE.IN_PROCESS || stageChangedTo === B2B_LEAD_STAGE.CONVERTED) {
        return res.status(400).json({
          success: false,
          message: `Cannot directly change to '${stageChangedTo}'. Please use the conversion request flow.`,
        });
      }
      followUp.stageChangedTo = stageChangedTo;
      await B2BLead.findByIdAndUpdate(followUp.b2bLeadId, { stage: stageChangedTo });
    }

    await followUp.save();

    // If next follow-up scheduled, create it
    let newFollowUp = null;
    if (nextFollowUp && nextFollowUp.scheduledDate && nextFollowUp.scheduledTime) {
      const nextDate = new Date(nextFollowUp.scheduledDate);
      const { start: dayStart, end: dayEnd } = getDayBounds(nextDate);

      // Check conflicts
      const conflictingFollowUps = await B2BFollowUp.find({
        b2bSalesId: profile._id,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
      }).populate("b2bLeadId", "firstName lastName");

      for (const existing of conflictingFollowUps) {
        if (
          doTimeSlotsOverlap(
            nextFollowUp.scheduledTime,
            nextFollowUp.duration || 30,
            existing.scheduledTime,
            existing.duration
          )
        ) {
          const existingLeadName = `${(existing.b2bLeadId as any)?.firstName || ""} ${(existing.b2bLeadId as any)?.lastName || ""}`.trim() || "Unknown Lead";
          return res.status(400).json({
            success: false,
            message: `Next follow-up time conflicts with another follow-up at ${existing.scheduledTime} for ${existingLeadName}`,
          });
        }
      }

      const lead = await B2BLead.findById(followUp.b2bLeadId);
      const existingFollowUpsCount = await B2BFollowUp.countDocuments({ b2bLeadId: followUp.b2bLeadId });
      const nextFollowUpNumber = existingFollowUpsCount + 1;

      const effectiveStage = stageChangedTo || lead?.stage || followUp.stageAtFollowUp;
      const nextStatus =
        effectiveStage === B2B_LEAD_STAGE.CONVERTED
          ? FOLLOWUP_STATUS.CONVERTED
          : FOLLOWUP_STATUS.SCHEDULED;

      const nextEffectiveMeetingType = nextFollowUp.meetingType || MEETING_TYPE.ONLINE;

      newFollowUp = new B2BFollowUp({
        b2bLeadId: followUp.b2bLeadId,
        b2bSalesId: profile._id,
        scheduledDate: nextDate,
        scheduledTime: nextFollowUp.scheduledTime,
        duration: nextFollowUp.duration || 30,
        meetingType: nextEffectiveMeetingType,
        status: nextStatus,
        stageAtFollowUp: effectiveStage,
        followUpNumber: nextFollowUpNumber,
        notes: "",
        createdBy: userId,
      });

      // Zoho meeting for next follow-up
      if (nextEffectiveMeetingType === MEETING_TYPE.ONLINE) {
        try {
          const [nHours, nMins] = nextFollowUp.scheduledTime.split(":").map(Number);
          const meetingStartTime = new Date(nextDate);
          meetingStartTime.setHours(nHours, nMins, 0, 0);

          const participantEmails: string[] = [];
          if (lead?.email) participantEmails.push(lead.email);

          const staffForMeeting = await getB2BModel(userRole).findById(profile._id).populate("userId", "email");
          const staffEmailForMeeting = (staffForMeeting?.userId as any)?.email;
          if (staffEmailForMeeting) participantEmails.push(staffEmailForMeeting);

          const leadFullName = lead ? [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ") : "B2B Lead";
          const zohoResult = await createZohoMeeting({
            topic: `B2B Follow-up #${nextFollowUpNumber} - ${leadFullName}`,
            startTime: meetingStartTime,
            duration: nextFollowUp.duration || 30,
            agenda: `B2B Follow-up meeting with ${leadFullName}`,
            participantEmails,
          });

          newFollowUp.zohoMeetingKey = zohoResult.meetingKey;
          newFollowUp.zohoMeetingUrl = zohoResult.meetingUrl;
          newFollowUp.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
          newFollowUp.zohoMeetingPassword = zohoResult.meetingPassword || "";
        } catch (zohoError) {
          console.error("⚠️  Zoho Meeting creation failed for next B2B follow-up:", zohoError);
        }
      }

      await newFollowUp.save();
      await newFollowUp.populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage");

      // Send email notifications for next follow-up
      const nextFormattedDate = nextDate.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const leadFullName = lead ? [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ") : "B2B Lead";

      const nextMeetingEmailDetails = {
        subject: `B2B Follow-up #${nextFollowUpNumber} - ${leadFullName}`,
        date: nextFormattedDate,
        time: nextFollowUp.scheduledTime,
        duration: nextFollowUp.duration || 30,
        meetingType: nextEffectiveMeetingType,
        meetingUrl: newFollowUp.zohoMeetingUrl || undefined,
        meetingId: newFollowUp.zohoMeetingId || undefined,
        meetingPassword: newFollowUp.zohoMeetingPassword || undefined,
        otherPartyName: "",
      };

      const staffForNextEmail = await getB2BModel(userRole).findById(profile._id).populate("userId", "email firstName middleName lastName");
      const staffUserNext = staffForNextEmail?.userId as any;
      const staffFullNameNext = staffUserNext
        ? [staffUserNext.firstName, staffUserNext.middleName, staffUserNext.lastName].filter(Boolean).join(" ")
        : "B2B Staff";

      if (lead?.email) {
        sendMeetingScheduledEmail(lead.email, leadFullName, {
          ...nextMeetingEmailDetails,
          otherPartyName: staffFullNameNext,
        }).catch((err) => console.error("Failed to send next B2B follow-up email to lead:", err));
      }

      if (staffUserNext?.email) {
        sendMeetingScheduledEmail(staffUserNext.email, staffFullNameNext, {
          ...nextMeetingEmailDetails,
          otherPartyName: leadFullName,
        }).catch((err) => console.error("Failed to send next B2B follow-up email to staff:", err));
      }
    }

    await followUp.populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage");

    return res.status(200).json({
      success: true,
      message: "B2B Follow-up updated successfully",
      data: { followUp, newFollowUp },
    });
  } catch (error) {
    console.error("Error updating B2B follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating B2B follow-up",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS / SUPER_ADMIN: Get follow-up history for a B2B lead
 */
export const getB2BLeadFollowUpHistory = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { b2bLeadId } = req.params;

    let lead;

    if (userRole === USER_ROLE.SUPER_ADMIN) {
      lead = await B2BLead.findById(b2bLeadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "B2B Lead not found",
        });
      }
    } else {
      const profile = await getB2BProfile(userId!, userRole);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "B2B profile not found",
        });
      }

      const leadFilter: any = { _id: b2bLeadId };
      if (userRole === USER_ROLE.B2B_OPS) {
        leadFilter.assignedB2BOpsId = profile._id;
      } else {
        leadFilter.assignedB2BSalesId = profile._id;
      }

      lead = await B2BLead.findOne(leadFilter);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "B2B Lead not found or not assigned to you",
        });
      }
    }

    const followUps = await B2BFollowUp.find({ b2bLeadId })
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ createdAt: -1 });

    const activeFollowUp = followUps.find(
      (f) => f.status === FOLLOWUP_STATUS.SCHEDULED
    );

    return res.status(200).json({
      success: true,
      data: {
        lead,
        followUps,
        hasActiveFollowUp: !!activeFollowUp,
        activeFollowUp: activeFollowUp || null,
      },
    });
  } catch (error) {
    console.error("Error fetching B2B lead follow-up history:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching B2B follow-up history",
    });
  }
};

/**
 * B2B_SALES / B2B_OPS: Check time slot availability
 */
export const checkB2BTimeSlotAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { date, time, duration } = req.query;

    if (!date || !time || !duration) {
      return res.status(400).json({
        success: false,
        message: "Date, time, and duration are required",
      });
    }

    const profile = await getB2BProfile(userId!, userRole);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "B2B profile not found",
      });
    }

    const checkDate = new Date(date as string);
    const { start: dayStart, end: dayEnd } = getDayBounds(checkDate);

    const existingFollowUps = await B2BFollowUp.find({
      b2bSalesId: profile._id,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    }).populate("b2bLeadId", "firstName lastName");

    let isAvailable = true;
    let conflictingTime = null;
    let conflictingLead = null;

    for (const existing of existingFollowUps) {
      if (
        doTimeSlotsOverlap(
          time as string,
          parseInt(duration as string),
          existing.scheduledTime,
          existing.duration
        )
      ) {
        isAvailable = false;
        conflictingTime = existing.scheduledTime;
        conflictingLead = `${(existing.b2bLeadId as any)?.firstName || ""} ${(existing.b2bLeadId as any)?.lastName || ""}`.trim() || "Unknown Lead";
        break;
      }
    }

    return res.status(200).json({
      success: true,
      data: { isAvailable, conflictingTime, conflictingLead },
    });
  } catch (error) {
    console.error("Error checking B2B time slot:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking time slot availability",
    });
  }
};

