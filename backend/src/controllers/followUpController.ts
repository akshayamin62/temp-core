import { Response } from "express";
import { AuthRequest } from "../types/auth";
import FollowUp, { FOLLOWUP_STATUS, MEETING_TYPE } from "../models/FollowUp";
import Lead, { LEAD_STAGE } from "../models/Lead";
import Counselor from "../models/Counselor";
import TeamMeet, { TEAMMEET_STATUS } from "../models/TeamMeet";
import mongoose from "mongoose";
import { USER_ROLE } from "../types/roles";
import { createZohoMeeting } from "../utils/zohoMeeting";
import { sendMeetingScheduledEmail } from "../utils/email";

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
 * COUNSELOR/ADMIN: Create a new follow-up
 */
export const createFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { leadId, scheduledDate, scheduledTime, duration, meetingType, notes } = req.body;

    // Validate required fields
    if (!leadId || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({
        success: false,
        message: "Lead ID, scheduled date, time, and duration are required",
      });
    }

    let lead;
    let counselorId;

    // Admin can create follow-up for any lead
    if (userRole === USER_ROLE.ADMIN) {
      lead = await Lead.findById(leadId).populate('assignedCounselorId');
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }
      // Use the assigned counselor's ID for the follow-up
      counselorId = lead.assignedCounselorId?._id;
      if (!counselorId) {
        return res.status(400).json({
          success: false,
          message: "Lead must be assigned to a counselor before scheduling follow-ups",
        });
      }
    } else {
      // Find counselor
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: "Counselor profile not found",
        });
      }

      // Validate lead exists and is assigned to this counselor
      lead = await Lead.findOne({
        _id: leadId,
        assignedCounselorId: counselor._id,
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found or not assigned to you",
        });
      }
      counselorId = counselor._id;
    }

    const scheduleDate = new Date(scheduledDate);
    const { start: dayStart, end: dayEnd } = getDayBounds(scheduleDate);

    // Check for time slot conflicts for the counselor on this date
    // Check ALL follow-ups regardless of status to prevent double-booking
    const existingFollowUps = await FollowUp.find({
      counselorId,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      // Removed status filter - check ALL statuses
    }).populate('leadId', 'name');

    console.log(`Checking ${existingFollowUps.length} existing follow-ups for counselor on ${scheduledDate}`);

    for (const existing of existingFollowUps) {
      const existingLeadName = (existing.leadId as any)?.name || 'Unknown Lead';
      console.log(`Checking against: ${existing.scheduledTime} (${existing.duration}min) for lead: ${existingLeadName}`);
      
      if (
        doTimeSlotsOverlap(
          scheduledTime,
          duration,
          existing.scheduledTime,
          existing.duration
        )
      ) {
        console.log('CONFLICT DETECTED!');
        return res.status(400).json({
          success: false,
          message: `Time slot conflicts with another follow-up scheduled at ${existing.scheduledTime} for ${existingLeadName}`,
        });
      }
    }
    
    // Also check TeamMeet conflicts for the counselor
    const counselor = await Counselor.findById(counselorId);
    if (counselor) {
      const existingTeamMeets = await TeamMeet.find({
        $or: [{ requestedBy: counselor.userId }, { requestedTo: counselor.userId }],
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: [TEAMMEET_STATUS.PENDING_CONFIRMATION, TEAMMEET_STATUS.CONFIRMED, TEAMMEET_STATUS.COMPLETED] },
      }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");

      for (const meet of existingTeamMeets) {
        if (doTimeSlotsOverlap(scheduledTime, duration, meet.scheduledTime, meet.duration)) {
          const otherUser = meet.requestedBy._id.toString() === counselor.userId?.toString()
            ? (meet.requestedTo as any)
            : (meet.requestedBy as any);
          const otherParty = [otherUser?.firstName, otherUser?.middleName, otherUser?.lastName].filter(Boolean).join(' ');
          console.log('CONFLICT DETECTED with TeamMeet!');
          return res.status(400).json({
            success: false,
            message: `Time slot conflicts with a TeamMeet at ${meet.scheduledTime} with ${otherParty || 'Unknown'}`,
          });
        }
      }
    }
    
    console.log('No conflicts found - time slot is available');

    // Count existing follow-ups for this lead to determine followUpNumber
    const existingFollowUpsForLead = await FollowUp.countDocuments({ leadId });
    const followUpNumber = existingFollowUpsForLead + 1;

    // If lead is already converted to student, lock the follow-up status
    const initialStatus =
      lead.stage === LEAD_STAGE.CONVERTED
        ? FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
        : FOLLOWUP_STATUS.SCHEDULED;

    // Create the follow-up
    const followUp = new FollowUp({
      leadId,
      counselorId,
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

    // If meeting type is Online, create a Zoho Meeting
    const effectiveMeetingType = meetingType || MEETING_TYPE.ONLINE;
    if (effectiveMeetingType === MEETING_TYPE.ONLINE) {
      try {
        // Build the meeting start time from date + time
        const [hours, mins] = scheduledTime.split(":").map(Number);
        const meetingStartTime = new Date(scheduleDate);
        meetingStartTime.setHours(hours, mins, 0, 0);

        const participantEmails: string[] = [];
        if (lead.email) participantEmails.push(lead.email);

        // Get counselor's email
        const counselorDoc = await Counselor.findById(counselorId).populate("userId", "email");
        const counselorEmail = (counselorDoc?.userId as any)?.email;
        if (counselorEmail) participantEmails.push(counselorEmail);

        const zohoResult = await createZohoMeeting({
          topic: `Follow-up #${followUpNumber} - ${lead.name}`,
          startTime: meetingStartTime,
          duration,
          agenda: notes || `Follow-up meeting with ${lead.name}`,
          participantEmails,
        });

        followUp.zohoMeetingKey = zohoResult.meetingKey;
        followUp.zohoMeetingUrl = zohoResult.meetingUrl;
      } catch (zohoError) {
        console.error("⚠️  Zoho Meeting creation failed (follow-up saved without link):", zohoError);
        // Non-fatal: follow-up is still created, just without the meeting link
      }
    }

    await followUp.save();

    // Populate lead info for response
    await followUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");

    // Send email notifications (non-blocking)
    const formattedDate = scheduleDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const meetingEmailDetails = {
      subject: `Follow-up #${followUpNumber} - ${lead.name}`,
      date: formattedDate,
      time: scheduledTime,
      duration,
      meetingType: effectiveMeetingType,
      meetingUrl: followUp.zohoMeetingUrl || undefined,
      otherPartyName: "",
      notes: notes || undefined,
    };

    // Get counselor user info for email
    const counselorForEmail = await Counselor.findById(counselorId).populate("userId", "email firstName middleName lastName");
    const counselorUser = counselorForEmail?.userId as any;
    const counselorFullName = counselorUser
      ? [counselorUser.firstName, counselorUser.middleName, counselorUser.lastName].filter(Boolean).join(" ")
      : "Your Counselor";

    // Email to lead
    if (lead.email) {
      sendMeetingScheduledEmail(lead.email, lead.name, {
        ...meetingEmailDetails,
        otherPartyName: counselorFullName,
      }).catch((err) => console.error("Failed to send meeting email to lead:", err));
    }

    // Email to counselor
    if (counselorUser?.email) {
      sendMeetingScheduledEmail(counselorUser.email, counselorFullName, {
        ...meetingEmailDetails,
        otherPartyName: lead.name,
      }).catch((err) => console.error("Failed to send meeting email to counselor:", err));
    }

    return res.status(201).json({
      success: true,
      message: "Follow-up scheduled successfully",
      data: { followUp },
    });
  } catch (error) {
    console.error("Error creating follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating follow-up",
    });
  }
};

/**
 * COUNSELOR: Get all follow-ups for counselor (calendar data)
 */
export const getCounselorFollowUps = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const counselorUserId = req.user?.userId;
    const { startDate, endDate, status } = req.query;

    const counselor = await Counselor.findOne({ userId: counselorUserId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: "Counselor profile not found",
      });
    }

    // Build filter
    const filter: any = { counselorId: counselor._id };

    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (status) {
      filter.status = status;
    }

    const followUps = await FollowUp.find(filter)
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { followUps },
    });
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching follow-ups",
    });
  }
};

/**
 * COUNSELOR: Get follow-up summary (Today, Missed, Upcoming)
 */
export const getFollowUpSummary = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const counselorUserId = req.user?.userId;

    const counselor = await Counselor.findOne({ userId: counselorUserId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: "Counselor profile not found",
      });
    }

    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start: tomorrowStart, end: tomorrowEnd } = getDayBounds(tomorrow);

    // Today's follow-ups
    const todayFollowUps = await FollowUp.find({
      counselorId: counselor._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledTime: 1 });

    // Missed follow-ups (past date + status still SCHEDULED)
    const missedFollowUps = await FollowUp.find({
      counselorId: counselor._id,
      scheduledDate: { $lt: todayStart },
      status: FOLLOWUP_STATUS.SCHEDULED,
    })
      .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
      .sort({ scheduledDate: -1 });

    // Upcoming (tomorrow only)
    const upcomingFollowUps = await FollowUp.find({
      counselorId: counselor._id,
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
    console.error("Error fetching follow-up summary:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching follow-up summary",
    });
  }
};

/**
 * COUNSELOR/ADMIN: Get follow-up by ID
 */
export const getFollowUpById = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { followUpId } = req.params;

    let followUp;

    // Admin and Super Admin can access any follow-up
    if (userRole === USER_ROLE.ADMIN || userRole === USER_ROLE.SUPER_ADMIN) {
      followUp = await FollowUp.findById(followUpId)
        .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");
    } else {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: "Counselor profile not found",
        });
      }

      followUp = await FollowUp.findOne({
        _id: followUpId,
        counselorId: counselor._id,
      }).populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");
    }

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    // Get total follow-ups count for this lead
    const totalFollowUpsForLead = await FollowUp.countDocuments({ leadId: followUp.leadId });

    // If this is not the latest follow-up, get the next follow-up's timing
    let nextFollowUpInfo = null;
    if (followUp.followUpNumber < totalFollowUpsForLead) {
      const nextFollowUp = await FollowUp.findOne({
        leadId: followUp.leadId,
        followUpNumber: followUp.followUpNumber + 1,
      }).select('scheduledDate scheduledTime duration followUpNumber meetingType');
      
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
      data: { 
        followUp,
        totalFollowUpsForLead,
        nextFollowUpInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching follow-up",
    });
  }
};

/**
 * COUNSELOR/ADMIN: Update follow-up (complete/reschedule)
 */
export const updateFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { followUpId } = req.params;
    const {
      status,
      stageChangedTo,
      notes,
      nextFollowUp, // { scheduledDate, scheduledTime, duration }
    } = req.body;

    let followUp;
    let counselorId;

    // Admin can update any follow-up
    if (userRole === USER_ROLE.ADMIN) {
      followUp = await FollowUp.findById(followUpId);
      if (!followUp) {
        return res.status(404).json({
          success: false,
          message: "Follow-up not found",
        });
      }
      counselorId = followUp.counselorId;
    } else {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: "Counselor profile not found",
        });
      }

      followUp = await FollowUp.findOne({
        _id: followUpId,
        counselorId: counselor._id,
      });

      if (!followUp) {
        return res.status(404).json({
          success: false,
          message: "Follow-up not found",
        });
      }
      counselorId = counselor._id;
    }

    // Check if follow-up is locked based on followUpNumber
    // A follow-up is locked when its followUpNumber < total follow-ups for the lead
    const totalFollowUpsForLead = await FollowUp.countDocuments({ leadId: followUp.leadId });
    const isLocked = followUp.followUpNumber < totalFollowUpsForLead;
    // const isLatestFollowUp = followUp.followUpNumber === totalFollowUpsForLead;

    // If locked (not the latest), prevent scheduling next follow-up
    if (isLocked && nextFollowUp) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule next follow-up from a locked follow-up. Only the latest follow-up can schedule next.",
      });
    }

    // Update follow-up fields
    if (status) {
      followUp.status = status;
      // Set completedAt if status is not SCHEDULED (only if not already set)
      if (status !== FOLLOWUP_STATUS.SCHEDULED && !followUp.completedAt) {
        followUp.completedAt = new Date();
      }
    }

    if (notes !== undefined) {
      followUp.notes = notes;
    }

    followUp.updatedBy = new mongoose.Types.ObjectId(userId);

    // If stage is changed, update both follow-up and lead
    if (stageChangedTo) {
      followUp.stageChangedTo = stageChangedTo;

      // Update the lead's stage
      await Lead.findByIdAndUpdate(followUp.leadId, {
        stage: stageChangedTo,
      });
    }

    await followUp.save();

    // If next follow-up is scheduled, create it
    let newFollowUp = null;
    if (nextFollowUp && nextFollowUp.scheduledDate && nextFollowUp.scheduledTime) {
      const nextDate = new Date(nextFollowUp.scheduledDate);
      const { start: dayStart, end: dayEnd } = getDayBounds(nextDate);

      // Check for time conflicts - check ALL follow-ups regardless of status
      const conflictingFollowUps = await FollowUp.find({
        counselorId,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        // Removed status filter - check ALL statuses
      }).populate('leadId', 'name');

      console.log(`Checking ${conflictingFollowUps.length} existing follow-ups for next follow-up on ${nextFollowUp.scheduledDate}`);

      for (const existing of conflictingFollowUps) {
        const existingLeadName = (existing.leadId as any)?.name || 'Unknown Lead';
        console.log(`Checking against: ${existing.scheduledTime} (${existing.duration}min) for lead: ${existingLeadName}`);
        
        if (
          doTimeSlotsOverlap(
            nextFollowUp.scheduledTime,
            nextFollowUp.duration || 30,
            existing.scheduledTime,
            existing.duration
          )
        ) {
          console.log('CONFLICT DETECTED for next follow-up!');
          return res.status(400).json({
            success: false,
            message: `Next follow-up time conflicts with another follow-up at ${existing.scheduledTime} for ${existingLeadName}`,
          });
        }
      }
      
      // Also check TeamMeet conflicts for the counselor
      const counselorDoc = await Counselor.findById(counselorId);
      if (counselorDoc) {
        const existingTeamMeets = await TeamMeet.find({
          $or: [{ requestedBy: counselorDoc.userId }, { requestedTo: counselorDoc.userId }],
          scheduledDate: { $gte: dayStart, $lte: dayEnd },
          status: { $in: [TEAMMEET_STATUS.PENDING_CONFIRMATION, TEAMMEET_STATUS.CONFIRMED, TEAMMEET_STATUS.COMPLETED] },
        }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");

        for (const meet of existingTeamMeets) {
          if (doTimeSlotsOverlap(nextFollowUp.scheduledTime, nextFollowUp.duration || 30, meet.scheduledTime, meet.duration)) {
            const otherUser = meet.requestedBy._id.toString() === counselorDoc.userId?.toString()
              ? (meet.requestedTo as any)
              : (meet.requestedBy as any);
            const otherParty = [otherUser?.firstName, otherUser?.middleName, otherUser?.lastName].filter(Boolean).join(' ');
            console.log('CONFLICT DETECTED with TeamMeet for next follow-up!');
            return res.status(400).json({
              success: false,
              message: `Next follow-up conflicts with a TeamMeet at ${meet.scheduledTime} with ${otherParty || 'Unknown'}`,
            });
          }
        }
      }
      
      console.log('No conflicts found for next follow-up - time slot is available');

      // Get current lead stage
      const lead = await Lead.findById(followUp.leadId);
      
      // Calculate followUpNumber for the next follow-up
      const existingFollowUpsCount = await FollowUp.countDocuments({ leadId: followUp.leadId });
      const nextFollowUpNumber = existingFollowUpsCount + 1;

      // If lead is already converted to student, lock the follow-up status
      const effectiveStage = stageChangedTo || lead?.stage || followUp.stageAtFollowUp;
      const nextStatus =
        effectiveStage === LEAD_STAGE.CONVERTED
          ? FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
          : FOLLOWUP_STATUS.SCHEDULED;

      newFollowUp = new FollowUp({
        leadId: followUp.leadId,
        counselorId,
        scheduledDate: nextDate,
        scheduledTime: nextFollowUp.scheduledTime,
        duration: nextFollowUp.duration || 30,
        meetingType: nextFollowUp.meetingType || MEETING_TYPE.ONLINE,
        status: nextStatus,
        stageAtFollowUp: effectiveStage,
        followUpNumber: nextFollowUpNumber,
        notes: "",
        createdBy: userId,
      });

      await newFollowUp.save();
      await newFollowUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");
    }

    // Populate and return updated follow-up
    await followUp.populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");

    return res.status(200).json({
      success: true,
      message: "Follow-up updated successfully",
      data: {
        followUp,
        newFollowUp,
      },
    });
  } catch (error) {
    console.error("Error updating follow-up:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating follow-up",
    });
  }
};

/**
 * COUNSELOR: Get follow-up history for a lead
 */
export const getLeadFollowUpHistory = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { leadId } = req.params;

    let lead;

    // Admin and Super Admin can access any lead's follow-up history
    if (userRole === USER_ROLE.ADMIN || userRole === USER_ROLE.SUPER_ADMIN) {
      lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }
    } else {
      // Counselor can only access assigned leads
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: "Counselor profile not found",
        });
      }

      // Verify lead is assigned to this counselor
      lead = await Lead.findOne({
        _id: leadId,
        assignedCounselorId: counselor._id,
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found or not assigned to you",
        });
      }
    }

    // Get all follow-ups for this lead (newest first)
    const followUps = await FollowUp.find({ leadId })
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ createdAt: -1 });

    // Check if lead has an active/future follow-up
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
    console.error("Error fetching lead follow-up history:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching follow-up history",
    });
  }
};

/**
 * COUNSELOR/ADMIN: Check time slot availability
 */
export const checkTimeSlotAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { date, time, duration, leadId } = req.query;

    if (!date || !time || !duration) {
      return res.status(400).json({
        success: false,
        message: "Date, time, and duration are required",
      });
    }

    let counselorId;

    // Admin needs to provide leadId to check availability for the assigned counselor
    if (userRole === USER_ROLE.ADMIN) {
      if (!leadId) {
        return res.status(400).json({
          success: false,
          message: "Lead ID is required for admin to check availability",
        });
      }
      const lead = await Lead.findById(leadId).populate('assignedCounselorId');
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }
      if (!lead.assignedCounselorId) {
        return res.status(400).json({
          success: false,
          message: "Lead must be assigned to a counselor first",
        });
      }
      counselorId = lead.assignedCounselorId._id;
    } else {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: "Counselor profile not found",
        });
      }
      counselorId = counselor._id;
    }

    const checkDate = new Date(date as string);
    const { start: dayStart, end: dayEnd } = getDayBounds(checkDate);

    // Check ALL follow-ups regardless of status for this counselor on this day
    const existingFollowUps = await FollowUp.find({
      counselorId,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      // Removed status filter - check ALL statuses
    }).populate('leadId', 'name');

    console.log(`Check availability: Found ${existingFollowUps.length} follow-ups on ${date}`);

    let isAvailable = true;
    let conflictingTime = null;
    let conflictingLead = null;
    let conflictType = 'FollowUp';

    for (const existing of existingFollowUps) {
      const existingLeadName = (existing.leadId as any)?.name || 'Unknown Lead';
      console.log(`Checking slot ${time} (${duration}min) against existing: ${existing.scheduledTime} (${existing.duration}min) for ${existingLeadName}`);
      
      if (
        doTimeSlotsOverlap(
          time as string,
          parseInt(duration as string),
          existing.scheduledTime,
          existing.duration
        )
      ) {
        console.log('CONFLICT FOUND with FollowUp!');
        isAvailable = false;
        conflictingTime = existing.scheduledTime;
        conflictingLead = existingLeadName;
        conflictType = 'FollowUp';
        break;
      }
    }

    // Also check TeamMeet conflicts if no FollowUp conflict found
    if (isAvailable) {
      const counselorDoc = await Counselor.findById(counselorId);
      if (counselorDoc) {
        const existingTeamMeets = await TeamMeet.find({
          $or: [{ requestedBy: counselorDoc.userId }, { requestedTo: counselorDoc.userId }],
          scheduledDate: { $gte: dayStart, $lte: dayEnd },
          status: { $in: [TEAMMEET_STATUS.PENDING_CONFIRMATION, TEAMMEET_STATUS.CONFIRMED, TEAMMEET_STATUS.COMPLETED] },
        }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");

        for (const meet of existingTeamMeets) {
          if (doTimeSlotsOverlap(time as string, parseInt(duration as string), meet.scheduledTime, meet.duration)) {
            const otherUser = meet.requestedBy._id.toString() === counselorDoc.userId?.toString()
              ? (meet.requestedTo as any)
              : (meet.requestedBy as any);
            const otherParty = [otherUser?.firstName, otherUser?.middleName, otherUser?.lastName].filter(Boolean).join(' ');
            console.log('CONFLICT FOUND with TeamMeet!');
            isAvailable = false;
            conflictingTime = meet.scheduledTime;
            conflictingLead = otherParty || 'Unknown';
            conflictType = 'TeamMeet';
            break;
          }
        }
      }
    }

    console.log(isAvailable ? 'Time slot is AVAILABLE' : `Time slot CONFLICTS with ${conflictType} at ${conflictingTime} (${conflictingLead})`);

    return res.status(200).json({
      success: true,
      data: {
        isAvailable,
        conflictingTime,
        conflictingLead,
        conflictType,
      },
    });
  } catch (error) {
    console.error("Error checking time slot:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking time slot availability",
    });
  }
};
