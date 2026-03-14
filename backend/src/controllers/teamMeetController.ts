import { Response } from "express";
import { AuthRequest } from "../types/auth";
import path from "path";
import fs from "fs";
import TeamMeet, { TEAMMEET_STATUS, TEAMMEET_TYPE } from "../models/TeamMeet";
import FollowUp, { } from "../models/FollowUp";
import User from "../models/User";
import Counselor from "../models/Counselor";
import Admin from "../models/Admin";
import Student from "../models/Student";
import Ops from "../models/Ops";
import EduplanCoach from "../models/EduplanCoach";
import IvyExpert from "../models/IvyExpert";
import Parent from "../models/Parent";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import mongoose from "mongoose";
import { USER_ROLE } from "../types/roles";
import { createZohoMeeting, deleteZohoMeeting } from "../utils/zohoMeeting";
import { sendMeetingPendingEmail, sendMeetingScheduledEmail, sendMeetingConfirmedEmail } from "../utils/email";
import { sendMeetingRequestSms } from "../utils/sms";
import { getUploadBaseDir, ensureDir } from "../utils/uploadDir";

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
 * Helper: Get admin ID for a user (either directly for admins, or via counselor relationship)
 */
const getAdminIdForUser = async (userId: string, userRole: string): Promise<mongoose.Types.ObjectId | null> => {
  if (userRole === USER_ROLE.ADMIN) {
    // For admin users, the userId IS the admin's user ID
    const admin = await Admin.findOne({ userId });
    return admin ? admin.userId : null;
  } else if (userRole === USER_ROLE.COUNSELOR) {
    const counselor = await Counselor.findOne({ userId });
    return counselor ? counselor.adminId : null;
  } else if (userRole === USER_ROLE.STUDENT) {
    const student = await Student.findOne({ userId });
    if (!student?.adminId) return null;
    const admin = await Admin.findOne({ _id: student.adminId });
    return admin ? admin.userId : null;
  } else if (userRole === USER_ROLE.OPS) {
    // OPS may serve multiple admins; find from their registrations
    const ops = await Ops.findOne({ userId });
    if (!ops) return null;
    const reg = await StudentServiceRegistration.findOne({
      $or: [{ primaryOpsId: ops._id }, { secondaryOpsId: ops._id }, { activeOpsId: ops._id }]
    }).populate({ path: 'studentId', select: 'adminId' });
    if (!reg) return null;
    const student = reg.studentId as any;
    if (!student?.adminId) return null;
    const admin = await Admin.findOne({ _id: student.adminId });
    return admin ? admin.userId : null;
  } else if (userRole === USER_ROLE.SUPER_ADMIN) {
    // Super admin doesn't belong to an org; return a sentinel
    return new mongoose.Types.ObjectId(userId);
  } else if (userRole === USER_ROLE.EDUPLAN_COACH) {
    // Eduplan coach is cross-org like super admin; return a sentinel
    return new mongoose.Types.ObjectId(userId);
  } else if (userRole === USER_ROLE.IVY_EXPERT) {
    // Ivy expert is cross-org like eduplan coach; return a sentinel
    return new mongoose.Types.ObjectId(userId);
  } else if (userRole === USER_ROLE.PARENT) {
    const parentDoc = await Parent.findOne({ userId });
    if (!parentDoc || !parentDoc.studentIds?.length) return null;
    const student = await Student.findOne({ _id: { $in: parentDoc.studentIds } });
    if (!student?.adminId) return new mongoose.Types.ObjectId(userId);
    const admin = await Admin.findOne({ _id: student.adminId });
    return admin ? admin.userId : new mongoose.Types.ObjectId(userId);
  }
  return null;
};

/**
 * Helper: Check availability for a user at a specific time
 * Checks both TeamMeets and FollowUps (all statuses except CANCELLED/REJECTED for TeamMeet, only SCHEDULED for FollowUp)
 */
const checkUserAvailability = async (
  userId: string,
  userRole: string,
  date: Date,
  time: string,
  duration: number,
  excludeTeamMeetId?: string
): Promise<{ isAvailable: boolean; conflict?: { type: string; time: string; with: string } }> => {
  const { start: dayStart, end: dayEnd } = getDayBounds(date);

  // Check TeamMeets - check PENDING_CONFIRMATION, CONFIRMED, and COMPLETED statuses
  const teamMeetQuery: any = {
    $or: [{ requestedBy: userId }, { requestedTo: userId }],
    scheduledDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: [TEAMMEET_STATUS.PENDING_CONFIRMATION, TEAMMEET_STATUS.CONFIRMED, TEAMMEET_STATUS.COMPLETED] },
  };

  if (excludeTeamMeetId) {
    teamMeetQuery._id = { $ne: excludeTeamMeetId };
  }

  const existingTeamMeets = await TeamMeet.find(teamMeetQuery)
    .populate("requestedBy", "firstName middleName lastName")
    .populate("requestedTo", "firstName middleName lastName");

  for (const meet of existingTeamMeets) {
    if (doTimeSlotsOverlap(time, duration, meet.scheduledTime, meet.duration)) {
      const otherParty = meet.requestedBy._id.toString() === userId
        ? [((meet.requestedTo as any)?.firstName), ((meet.requestedTo as any)?.middleName), ((meet.requestedTo as any)?.lastName)].filter(Boolean).join(' ')
        : [((meet.requestedBy as any)?.firstName), ((meet.requestedBy as any)?.middleName), ((meet.requestedBy as any)?.lastName)].filter(Boolean).join(' ');
      return {
        isAvailable: false,
        conflict: {
          type: "TeamMeet",
          time: meet.scheduledTime,
          with: otherParty || "Unknown",
        },
      };
    }
  }

  // Check FollowUps (only for counselors) - ALL statuses (SCHEDULED, COMPLETED, MISSED, RESCHEDULED)
  // This ensures no double-booking even for past/completed follow-ups
  if (userRole === USER_ROLE.COUNSELOR) {
    const counselor = await Counselor.findOne({ userId });
    if (counselor) {
      const existingFollowUps = await FollowUp.find({
        counselorId: counselor._id,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        // Check ALL statuses - any follow-up at this time blocks the slot
      }).populate("leadId", "name");

      for (const followUp of existingFollowUps) {
        if (doTimeSlotsOverlap(time, duration, followUp.scheduledTime, followUp.duration)) {
          const leadName = (followUp.leadId as any)?.name || "Unknown Lead";
          return {
            isAvailable: false,
            conflict: {
              type: "FollowUp",
              time: followUp.scheduledTime,
              with: leadName,
            },
          };
        }
      }
    }
  }

  return { isAvailable: true };
};

/**
 * Create a new team meeting request
 */
export const createTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const {
      subject,
      scheduledDate,
      scheduledTime,
      duration,
      meetingType,
      description,
      requestedTo,
    } = req.body;

    // Validate required fields
    if (!subject || !scheduledDate || !scheduledTime || !duration || !requestedTo) {
      return res.status(400).json({
        success: false,
        message: "Subject, date, time, duration, and recipient are required",
      });
    }

    // Parse duration as integer (may arrive as string when sent via multipart/form-data)
    const parsedDuration = parseInt(duration as any, 10);

    // Validate duration
    if (![15, 30, 45, 60].includes(parsedDuration)) {
      return res.status(400).json({
        success: false,
        message: "Duration must be 15, 30, 45, or 60 minutes",
      });
    }

    // Validate meeting type
    if (meetingType && !Object.values(TEAMMEET_TYPE).includes(meetingType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting type",
      });
    }

    // Check recipient exists and is admin or counselor
    const recipient = await User.findById(requestedTo);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    const allowedRecipientRoles = [
      USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN,
      USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT,
      USER_ROLE.PARENT,
    ];
    if (!allowedRecipientRoles.includes(recipient.role as USER_ROLE)) {
      return res.status(400).json({
        success: false,
        message: "Recipient role is not eligible for meetings",
      });
    }

    // Cannot send meeting to yourself
    if (requestedTo === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule a meeting with yourself",
      });
    }

    // Get admin ID for organization context
    const adminId = await getAdminIdForUser(userId!, userRole!);
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Could not determine organization context",
      });
    }

    const scheduleDate = new Date(scheduledDate);

    // Block past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduleDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule meetings in the past",
      });
    }

    // Check sender availability
    const senderAvailability = await checkUserAvailability(
      userId!,
      userRole!,
      scheduleDate,
      scheduledTime,
      parsedDuration
    );

    if (!senderAvailability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `You have a conflict: ${senderAvailability.conflict?.type} at ${senderAvailability.conflict?.time} with ${senderAvailability.conflict?.with}`,
      });
    }

    // Check recipient availability
    const recipientAvailability = await checkUserAvailability(
      requestedTo,
      recipient.role,
      scheduleDate,
      scheduledTime,
      parsedDuration
    );

    if (!recipientAvailability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `${[recipient.firstName, recipient.middleName, recipient.lastName].filter(Boolean).join(' ')} has a conflict: ${recipientAvailability.conflict?.type} at ${recipientAvailability.conflict?.time}`,
      });
    }

    // Create the team meeting
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    let attachmentSize: number | undefined;

    if (req.file) {
      const teamMeetDir = path.join(getUploadBaseDir(), 'team-meets');
      ensureDir(teamMeetDir);
      const ext = path.extname(req.file.originalname);
      const sanitizedName = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const finalFilename = `${sanitizedName}_${Date.now()}${ext}`;
      const finalPath = path.join(teamMeetDir, finalFilename);
      fs.renameSync(req.file.path, finalPath);
      attachmentUrl = `uploads/team-meets/${finalFilename}`;
      attachmentName = req.file.originalname;
      attachmentSize = req.file.size;
    }

    const teamMeet = new TeamMeet({
      subject,
      scheduledDate: scheduleDate,
      scheduledTime,
      duration: parsedDuration,
      meetingType: meetingType || TEAMMEET_TYPE.ONLINE,
      description,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      requestedBy: userId,
      requestedTo,
      adminId,
      status: TEAMMEET_STATUS.PENDING_CONFIRMATION,
    });

    // If meeting type is Online, Zoho Meeting will be created when status changes to CONFIRMED
    // (see acceptTeamMeet handler)

    await teamMeet.save();

    // Populate for response
    const populatedMeet = await TeamMeet.findById(teamMeet._id)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    // Send email notification (non-blocking) — only to the receiver (pending confirmation)
    const formattedDate = scheduleDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const senderUser = await User.findById(userId).select("firstName middleName lastName email");
    const senderFullName = senderUser
      ? [senderUser.firstName, senderUser.middleName, senderUser.lastName].filter(Boolean).join(" ")
      : "A team member";
    const recipientFullName = [recipient.firstName, recipient.middleName, recipient.lastName].filter(Boolean).join(" ");

    const effectiveMeetingType = meetingType || TEAMMEET_TYPE.ONLINE;

    // Email to recipient only (the person who needs to confirm)
    if (recipient.email) {
      sendMeetingPendingEmail(recipient.email, recipientFullName, {
        subject,
        date: formattedDate,
        time: scheduledTime,
        duration: parsedDuration,
        meetingType: effectiveMeetingType === TEAMMEET_TYPE.ONLINE ? "Online" : "Face to Face",
        otherPartyName: senderFullName,
        agenda: description || undefined,
      }).catch((err) => console.error("Failed to send pending meeting email to recipient:", err));
    }

    // SMS to recipient (non-blocking) — look up mobile from Admin or Counselor profile
    try {
      let recipientMobile: string | undefined;
      if (recipient.role === USER_ROLE.ADMIN) {
        const adminProfile = await Admin.findOne({ userId: recipient._id }).select('mobileNumber');
        recipientMobile = adminProfile?.mobileNumber;
      } else if (recipient.role === USER_ROLE.COUNSELOR) {
        const counselorProfile = await Counselor.findOne({ userId: recipient._id }).select('mobileNumber');
        recipientMobile = counselorProfile?.mobileNumber;
      }
      if (recipientMobile) {
        sendMeetingRequestSms({ mobile: recipientMobile, senderName: senderFullName })
          .catch((err) => console.error('Failed to send meeting request SMS:', err));
      }
    } catch (smsLookupErr) {
      console.error('SMS lookup error (non-fatal):', smsLookupErr);
    }

    return res.status(201).json({
      success: true,
      message: "Meeting request sent successfully",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error creating team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create meeting request",
    });
  }
};

/**
 * Get all team meetings for the current user
 */
export const getTeamMeets = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { status, startDate, endDate } = req.query;

    const query: any = {
      $or: [{ requestedBy: userId }, { requestedTo: userId }, { invitedUsers: userId }],
    };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const teamMeets = await TeamMeet.find(query)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { teamMeets },
    });
  } catch (error) {
    console.error("Error fetching team meets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meetings",
    });
  }
};

/**
 * Get team meetings for calendar display
 */
export const getTeamMeetsForCalendar = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { month, year } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (month && year) {
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      // Expand to include 1 week before and after for calendar edge display
      startDate = new Date(yearNum, monthNum - 1, -6); // 1 week before month start
      endDate = new Date(yearNum, monthNum, 7, 23, 59, 59, 999); // 1 week after month end
    } else {
      // Default to 3 months range (past month + current + next month)
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }

    const teamMeets = await TeamMeet.find({
      $or: [{ requestedBy: userId }, { requestedTo: userId }, { invitedUsers: userId }],
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { teamMeets },
    });
  } catch (error) {
    console.error("Error fetching team meets for calendar:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meetings for calendar",
    });
  }
};

/**
 * Get single team meeting by ID
 */
export const getTeamMeetById = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;

    const teamMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role");

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Check if user is a participant or invited
    const isInvited = teamMeet.invitedUsers?.some(
      (u: any) => u._id?.toString() === userId || u.toString() === userId
    );
    if (
      teamMeet.requestedBy.toString() !== userId &&
      teamMeet.requestedTo.toString() !== userId &&
      !isInvited
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this meeting",
      });
    }

    return res.status(200).json({
      success: true,
      data: { teamMeet },
    });
  } catch (error) {
    console.error("Error fetching team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meeting",
    });
  }
};

/**
 * Accept a team meeting invitation
 */
export const acceptTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;

    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only recipient can accept
    if (teamMeet.requestedTo.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the recipient can accept this meeting",
      });
    }

    // Can only accept pending meetings
    if (teamMeet.status !== TEAMMEET_STATUS.PENDING_CONFIRMATION) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept a meeting with status: ${teamMeet.status}`,
      });
    }

    teamMeet.status = TEAMMEET_STATUS.CONFIRMED;

    // Create Zoho Meeting now that the meeting is confirmed
    if (teamMeet.meetingType === TEAMMEET_TYPE.ONLINE) {
      try {
        const [hours, mins] = teamMeet.scheduledTime.split(":").map(Number);
        const meetingStartTime = new Date(teamMeet.scheduledDate);
        meetingStartTime.setHours(hours, mins, 0, 0);

        const sender = await User.findById(teamMeet.requestedBy).select("email");
        const recipient = await User.findById(teamMeet.requestedTo).select("email");
        const participantEmails: string[] = [];
        if (sender?.email) participantEmails.push(sender.email);
        if (recipient?.email) participantEmails.push(recipient.email);

        const zohoResult = await createZohoMeeting({
          topic: teamMeet.subject,
          startTime: meetingStartTime,
          duration: teamMeet.duration,
          agenda: teamMeet.description || teamMeet.subject,
          participantEmails,
        });

        teamMeet.zohoMeetingKey = zohoResult.meetingKey;
        teamMeet.zohoMeetingUrl = zohoResult.meetingUrl;
        teamMeet.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
        teamMeet.zohoMeetingPassword = zohoResult.meetingPassword || "";
      } catch (zohoError) {
        console.error("⚠️  Zoho Meeting creation failed (meeting confirmed without link):", zohoError);
      }
    }

    await teamMeet.save();

    const populatedMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    // Send confirmation emails with meeting link to both parties
    const senderUser = await User.findById(teamMeet.requestedBy).select("firstName middleName lastName email");
    const recipientUser = await User.findById(teamMeet.requestedTo).select("firstName middleName lastName email");
    const senderFullName = senderUser
      ? [senderUser.firstName, senderUser.middleName, senderUser.lastName].filter(Boolean).join(" ")
      : "A team member";
    const recipientFullName = recipientUser
      ? [recipientUser.firstName, recipientUser.middleName, recipientUser.lastName].filter(Boolean).join(" ")
      : "A team member";

    const formattedDate = teamMeet.scheduledDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const confirmedEmailBase = {
      subject: teamMeet.subject,
      date: formattedDate,
      time: teamMeet.scheduledTime,
      duration: teamMeet.duration,
      meetingType: teamMeet.meetingType === TEAMMEET_TYPE.ONLINE ? "Online" : "Face to Face",
      meetingUrl: teamMeet.zohoMeetingUrl || undefined,
      meetingId: teamMeet.zohoMeetingId || undefined,
      meetingPassword: teamMeet.zohoMeetingPassword || undefined,
      agenda: teamMeet.description || undefined,
    };

    // Email to meeting creator (requestedBy)
    if (senderUser?.email) {
      sendMeetingConfirmedEmail(senderUser.email, senderFullName, {
        ...confirmedEmailBase,
        otherPartyName: recipientFullName,
      }).catch((err) => console.error("Failed to send confirmed email to sender:", err));
    }

    // Email to acceptor (requestedTo)
    if (recipientUser?.email) {
      sendMeetingConfirmedEmail(recipientUser.email, recipientFullName, {
        ...confirmedEmailBase,
        otherPartyName: senderFullName,
      }).catch((err) => console.error("Failed to send confirmed email to recipient:", err));
    }

    return res.status(200).json({
      success: true,
      message: "Meeting accepted successfully",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error accepting team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept meeting",
    });
  }
};

/**
 * Reject a team meeting invitation
 */
export const rejectTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;
    const { rejectionMessage } = req.body;

    if (!rejectionMessage || rejectionMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rejection message is required",
      });
    }

    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only recipient can reject
    if (teamMeet.requestedTo.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the recipient can reject this meeting",
      });
    }

    // Can only reject pending meetings
    if (teamMeet.status !== TEAMMEET_STATUS.PENDING_CONFIRMATION) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a meeting with status: ${teamMeet.status}`,
      });
    }

    teamMeet.status = TEAMMEET_STATUS.REJECTED;
    teamMeet.rejectionMessage = rejectionMessage.trim();
    await teamMeet.save();

    const populatedMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: "Meeting rejected",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error rejecting team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject meeting",
    });
  }
};

/**
 * Cancel a team meeting
 */
export const cancelTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;

    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only sender can cancel
    if (teamMeet.requestedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the sender can cancel this meeting",
      });
    }

    // Can only cancel pending or confirmed meetings
    if (![TEAMMEET_STATUS.PENDING_CONFIRMATION, TEAMMEET_STATUS.CONFIRMED].includes(teamMeet.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a meeting with status: ${teamMeet.status}`,
      });
    }

    teamMeet.status = TEAMMEET_STATUS.CANCELLED;

    // Delete Zoho Meeting if it was created (for confirmed meetings that get cancelled)
    if (teamMeet.zohoMeetingKey) {
      deleteZohoMeeting(teamMeet.zohoMeetingKey).catch((err) =>
        console.error("Failed to delete Zoho Meeting on cancel:", err)
      );
      teamMeet.zohoMeetingKey = undefined;
      teamMeet.zohoMeetingUrl = undefined;
      teamMeet.zohoMeetingId = undefined;
      teamMeet.zohoMeetingPassword = undefined;
    }

    await teamMeet.save();

    const populatedMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: "Meeting cancelled",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error cancelling team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel meeting",
    });
  }
};

/**
 * Reschedule a team meeting
 */
export const rescheduleTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { teamMeetId } = req.params;
    const { scheduledDate, scheduledTime, duration, subject, description } = req.body;

    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only sender can reschedule
    if (teamMeet.requestedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the sender can reschedule this meeting",
      });
    }

    // Can only reschedule rejected or pending meetings
    if (![TEAMMEET_STATUS.REJECTED, TEAMMEET_STATUS.PENDING_CONFIRMATION].includes(teamMeet.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule a meeting with status: ${teamMeet.status}`,
      });
    }

    // Validate new schedule
    if (!scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({
        success: false,
        message: "New date, time, and duration are required",
      });
    }

    const scheduleDate = new Date(scheduledDate);

    // Block past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduleDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule meetings to a past date",
      });
    }

    const recipient = await User.findById(teamMeet.requestedTo);

    // Check sender availability
    const senderAvailability = await checkUserAvailability(
      userId!,
      userRole!,
      scheduleDate,
      scheduledTime,
      duration,
      teamMeetId
    );

    if (!senderAvailability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `You have a conflict: ${senderAvailability.conflict?.type} at ${senderAvailability.conflict?.time}`,
      });
    }

    // Check recipient availability
    const recipientAvailability = await checkUserAvailability(
      teamMeet.requestedTo.toString(),
      recipient?.role || USER_ROLE.COUNSELOR,
      scheduleDate,
      scheduledTime,
      duration,
      teamMeetId
    );

    if (!recipientAvailability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Recipient has a conflict at ${recipientAvailability.conflict?.time}`,
      });
    }

    // Update meeting
    teamMeet.scheduledDate = scheduleDate;
    teamMeet.scheduledTime = scheduledTime;
    teamMeet.duration = duration;
    if (subject) teamMeet.subject = subject;
    if (description !== undefined) teamMeet.description = description;
    teamMeet.status = TEAMMEET_STATUS.PENDING_CONFIRMATION;
    teamMeet.rejectionMessage = undefined;

    await teamMeet.save();

    const populatedMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: "Meeting rescheduled successfully",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error rescheduling team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reschedule meeting",
    });
  }
};

/**
 * Mark a team meeting as completed
 */
export const completeTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;

    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only the creator (requestedBy) can mark as completed
    if (teamMeet.requestedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting creator can mark this meeting as completed",
      });
    }

    // Can only complete confirmed meetings
    if (teamMeet.status !== TEAMMEET_STATUS.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: "Only confirmed meetings can be marked as completed",
      });
    }

    // Store notes if provided
    if (req.body?.notes !== undefined) {
      teamMeet.notes = req.body.notes;
    }

    teamMeet.status = TEAMMEET_STATUS.COMPLETED;
    teamMeet.completedAt = new Date();
    await teamMeet.save();

    const populatedMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: "Meeting marked as completed",
      data: { teamMeet: populatedMeet },
    });
  } catch (error) {
    console.error("Error completing team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete meeting",
    });
  }
};

/**
 * Check availability for a time slot
 */
export const checkTeamMeetAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { date, time, duration, participantId } = req.query;

    if (!date || !time || !duration || !participantId) {
      return res.status(400).json({
        success: false,
        message: "Date, time, duration, and participant ID are required",
      });
    }

    const scheduleDate = new Date(date as string);
    const durationNum = parseInt(duration as string);

    // Check sender availability
    const senderAvailability = await checkUserAvailability(
      userId!,
      userRole!,
      scheduleDate,
      time as string,
      durationNum
    );

    // Check recipient availability
    const recipient = await User.findById(participantId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    const recipientAvailability = await checkUserAvailability(
      participantId as string,
      recipient.role,
      scheduleDate,
      time as string,
      durationNum
    );

    const isAvailable = senderAvailability.isAvailable && recipientAvailability.isAvailable;

    return res.status(200).json({
      success: true,
      data: {
        isAvailable,
        senderAvailable: senderAvailability.isAvailable,
        senderConflict: senderAvailability.conflict,
        recipientAvailable: recipientAvailability.isAvailable,
        recipientConflict: recipientAvailability.conflict,
      },
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check availability",
    });
  }
};

/**
 * Helper: Format a user object for the participants list
 */
const formatParticipant = (user: any, studentName?: string) => ({
  _id: user._id,
  firstName: user.firstName,
  middleName: user.middleName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  ...(studentName ? { studentName } : {}),
});

/**
 * Helper: Find all parents for a set of student document IDs and add them as participants
 */
const addParentsForStudents = async (
  studentDocIds: (string | mongoose.Types.ObjectId)[],
  seen: Set<string>,
  participants: any[],
  selfUserId: string
) => {
  if (!studentDocIds.length) return;
  const parentDocs = await Parent.find({ studentIds: { $in: studentDocIds } })
    .populate("userId", "_id firstName middleName lastName email role");
  for (const p of parentDocs) {
    const pUser = p.userId as any;
    if (!pUser) continue;
    const id = pUser._id.toString();
    if (id === selfUserId || seen.has(id)) continue;
    // Find which student(s) this parent belongs to
    const matchedStudentIds = p.studentIds.filter((sid: any) =>
      studentDocIds.some((docId) => docId.toString() === sid.toString())
    );
    if (matchedStudentIds.length > 0) {
      const students = await Student.find({ _id: { $in: matchedStudentIds } })
        .populate("userId", "firstName middleName lastName");
      const studentNames = students
        .map((s: any) => [s.userId?.firstName, s.userId?.middleName, s.userId?.lastName].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(", ");
      seen.add(id);
      participants.push(formatParticipant(pUser, studentNames || undefined));
    }
  }
};

/**
 * Get list of participants available for meetings (role-aware)
 *
 * STUDENT  → their counselor + ops assigned to their registrations
 * COUNSELOR → their admin + their students + ops on those students
 * ADMIN    → their counselors + super admins + their students + ops on those students
 * SUPER_ADMIN → all users (ADMIN, COUNSELOR, STUDENT, OPS)
 * OPS      → students they are assigned to + those students' counselors + admin
 */
export const getParticipants = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const seen = new Set<string>();
    const participants: any[] = [];

    const addUser = (u: any) => {
      if (!u) return;
      const id = u._id.toString();
      if (id === userId || seen.has(id)) return;
      seen.add(id);
      participants.push(formatParticipant(u));
    };

    // ── SUPER_ADMIN: all users with meeting-eligible roles ──
    if (userRole === USER_ROLE.SUPER_ADMIN) {
      const users = await User.find({
        role: { $in: [USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT] },
        _id: { $ne: userId },
      }).select("_id firstName middleName lastName email role");
      users.forEach(addUser);

      // Add all parents with student names
      const allStudents = await Student.find({}).select("_id");
      await addParentsForStudents(allStudents.map(s => s._id), seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── STUDENT: counselor + ops ──
    if (userRole === USER_ROLE.STUDENT) {
      const student = await Student.findOne({ userId });
      if (!student) return res.status(404).json({ success: false, message: "Student record not found" });

      // Counselor
      if (student.counselorId) {
        const counselor = await Counselor.findById(student.counselorId).populate("userId", "_id firstName middleName lastName email role");
        if (counselor) addUser((counselor.userId as any));
      }

      // OPS + Eduplan Coach + Ivy Expert assigned to this student's registrations
      const regs = await StudentServiceRegistration.find({ studentId: student._id })
        .populate({ path: 'activeOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } });
      for (const reg of regs) {
        if ((reg as any).activeOpsId?.userId) addUser((reg as any).activeOpsId.userId);
        if ((reg as any).primaryOpsId?.userId) addUser((reg as any).primaryOpsId.userId);
        if ((reg as any).secondaryOpsId?.userId) addUser((reg as any).secondaryOpsId.userId);
        if ((reg as any).activeEduplanCoachId?.userId) addUser((reg as any).activeEduplanCoachId.userId);
        if ((reg as any).primaryEduplanCoachId?.userId) addUser((reg as any).primaryEduplanCoachId.userId);
        if ((reg as any).secondaryEduplanCoachId?.userId) addUser((reg as any).secondaryEduplanCoachId.userId);
        if ((reg as any).activeIvyExpertId?.userId) addUser((reg as any).activeIvyExpertId.userId);
        if ((reg as any).primaryIvyExpertId?.userId) addUser((reg as any).primaryIvyExpertId.userId);
        if ((reg as any).secondaryIvyExpertId?.userId) addUser((reg as any).secondaryIvyExpertId.userId);
      }

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── PARENT: same participants as their student(s): counselor + ops + eduplan + ivy expert ──
    if (userRole === USER_ROLE.PARENT) {
      const parentDoc = await Parent.findOne({ userId });
      if (!parentDoc || !parentDoc.studentIds?.length) {
        return res.status(200).json({ success: true, data: { participants } });
      }
      const students = await Student.find({ _id: { $in: parentDoc.studentIds } })
        .populate("userId", "_id firstName middleName lastName email role");
      for (const s of students) {
        if (s.counselorId) {
          const counselor = await Counselor.findById(s.counselorId).populate("userId", "_id firstName middleName lastName email role");
          if (counselor) addUser((counselor.userId as any));
        }
      }
      const regs = await StudentServiceRegistration.find({ studentId: { $in: parentDoc.studentIds } })
        .populate({ path: 'activeOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryIvyExpertId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } });
      for (const reg of regs) {
        if ((reg as any).activeOpsId?.userId) addUser((reg as any).activeOpsId.userId);
        if ((reg as any).primaryOpsId?.userId) addUser((reg as any).primaryOpsId.userId);
        if ((reg as any).secondaryOpsId?.userId) addUser((reg as any).secondaryOpsId.userId);
        if ((reg as any).activeEduplanCoachId?.userId) addUser((reg as any).activeEduplanCoachId.userId);
        if ((reg as any).primaryEduplanCoachId?.userId) addUser((reg as any).primaryEduplanCoachId.userId);
        if ((reg as any).secondaryEduplanCoachId?.userId) addUser((reg as any).secondaryEduplanCoachId.userId);
        if ((reg as any).activeIvyExpertId?.userId) addUser((reg as any).activeIvyExpertId.userId);
        if ((reg as any).primaryIvyExpertId?.userId) addUser((reg as any).primaryIvyExpertId.userId);
        if ((reg as any).secondaryIvyExpertId?.userId) addUser((reg as any).secondaryIvyExpertId.userId);
      }
      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── ADMIN: counselors + super admins + students + ops ──
    if (userRole === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin) return res.status(404).json({ success: false, message: "Admin record not found" });

      // Counselors under this admin
      const counselors = await Counselor.find({ adminId: admin.userId })
        .populate("userId", "_id firstName middleName lastName email role");
      for (const c of counselors) addUser((c.userId as any));

      // Super admins
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN })
        .select("_id firstName middleName lastName email role");
      superAdmins.forEach(addUser);

      // Students under this admin
      const students = await Student.find({ adminId: admin._id })
        .populate("userId", "_id firstName middleName lastName email role");
      for (const s of students) addUser((s.userId as any));

      // OPS assigned to those students
      const studentIds = students.map(s => s._id);
      const regs = await StudentServiceRegistration.find({ studentId: { $in: studentIds } })
        .populate({ path: 'activeOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } });
      for (const reg of regs) {
        if ((reg as any).activeOpsId?.userId) addUser((reg as any).activeOpsId.userId);
        if ((reg as any).primaryOpsId?.userId) addUser((reg as any).primaryOpsId.userId);
        if ((reg as any).secondaryOpsId?.userId) addUser((reg as any).secondaryOpsId.userId);
        if ((reg as any).activeEduplanCoachId?.userId) addUser((reg as any).activeEduplanCoachId.userId);
        if ((reg as any).primaryEduplanCoachId?.userId) addUser((reg as any).primaryEduplanCoachId.userId);
        if ((reg as any).secondaryEduplanCoachId?.userId) addUser((reg as any).secondaryEduplanCoachId.userId);
      }

      // Parents of admin's students
      await addParentsForStudents(studentIds, seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── COUNSELOR: admin + students + ops ──
    if (userRole === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) return res.status(404).json({ success: false, message: "Counselor record not found" });

      // Admin
      const adminUser = await User.findById(counselor.adminId)
        .select("_id firstName middleName lastName email role");
      addUser(adminUser);

      // Students assigned to this counselor
      const students = await Student.find({ counselorId: counselor._id })
        .populate("userId", "_id firstName middleName lastName email role");
      for (const s of students) addUser((s.userId as any));

      // OPS assigned to those students
      const studentIds = students.map(s => s._id);
      const regs = await StudentServiceRegistration.find({ studentId: { $in: studentIds } })
        .populate({ path: 'activeOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryOpsId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'activeEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'primaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } })
        .populate({ path: 'secondaryEduplanCoachId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } });
      for (const reg of regs) {
        if ((reg as any).activeOpsId?.userId) addUser((reg as any).activeOpsId.userId);
        if ((reg as any).primaryOpsId?.userId) addUser((reg as any).primaryOpsId.userId);
        if ((reg as any).secondaryOpsId?.userId) addUser((reg as any).secondaryOpsId.userId);
        if ((reg as any).activeEduplanCoachId?.userId) addUser((reg as any).activeEduplanCoachId.userId);
        if ((reg as any).primaryEduplanCoachId?.userId) addUser((reg as any).primaryEduplanCoachId.userId);
        if ((reg as any).secondaryEduplanCoachId?.userId) addUser((reg as any).secondaryEduplanCoachId.userId);
      }

      // Parents of counselor's students
      await addParentsForStudents(studentIds, seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── OPS: assigned students + their counselors + admin ──
    if (userRole === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });
      if (!ops) return res.status(404).json({ success: false, message: "Ops record not found" });

      const regs = await StudentServiceRegistration.find({
        $or: [{ primaryOpsId: ops._id }, { secondaryOpsId: ops._id }, { activeOpsId: ops._id }]
      }).populate({ path: 'studentId', populate: { path: 'userId', select: '_id firstName middleName lastName email role' } });

      for (const reg of regs) {
        const student = reg.studentId as any;
        if (student?.userId) addUser(student.userId);
      }

      // Get admins and counselors for those students
      const studentDocs = await Student.find({
        _id: { $in: regs.map(r => r.studentId) }
      }).populate("userId", "_id firstName middleName lastName email role");

      const adminIds = new Set<string>();
      const counselorIds = new Set<string>();
      for (const s of studentDocs) {
        if (s.adminId) adminIds.add(s.adminId.toString());
        if (s.counselorId) counselorIds.add(s.counselorId.toString());
      }

      // Admin users
      for (const aId of adminIds) {
        const adminDoc = await Admin.findById(aId).populate("userId", "_id firstName middleName lastName email role");
        if (adminDoc) addUser((adminDoc.userId as any));
      }

      // Counselor users
      for (const cId of counselorIds) {
        const counselorDoc = await Counselor.findById(cId).populate("userId", "_id firstName middleName lastName email role");
        if (counselorDoc) addUser((counselorDoc.userId as any));
      }

      // Super admins
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN })
        .select("_id firstName middleName lastName email role");
      superAdmins.forEach(addUser);

      // Parents of ops's students
      await addParentsForStudents(studentDocs.map(s => s._id), seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── EDUPLAN_COACH: super admins + assigned students + those students' admin + counselor ──
    if (userRole === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId });
      if (!coach) return res.status(404).json({ success: false, message: "EduplanCoach record not found" });

      // Super admins
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN })
        .select("_id firstName middleName lastName email role");
      superAdmins.forEach(addUser);

      // Students assigned to this coach
      const regs = await StudentServiceRegistration.find({
        $or: [
          { activeEduplanCoachId: coach._id },
          { activeEduplanCoachId: { $exists: false }, primaryEduplanCoachId: coach._id },
          { activeEduplanCoachId: null, primaryEduplanCoachId: coach._id },
        ],
      }).populate({
        path: "studentId",
        populate: { path: "userId", select: "_id firstName middleName lastName email role" },
      });

      const studentDocIds: string[] = [];
      for (const reg of regs) {
        const student = reg.studentId as any;
        if (student?.userId) {
          addUser(student.userId);
          studentDocIds.push(student._id.toString());
        }
      }

      // Admin and counselor for those students
      const studentDocs = await Student.find({ _id: { $in: studentDocIds } });
      const adminIds = new Set<string>();
      const counselorIds = new Set<string>();
      for (const s of studentDocs) {
        if (s.adminId) adminIds.add(s.adminId.toString());
        if (s.counselorId) counselorIds.add(s.counselorId.toString());
      }

      for (const aId of adminIds) {
        const adminDoc = await Admin.findById(aId).populate("userId", "_id firstName middleName lastName email role");
        if (adminDoc) addUser((adminDoc.userId as any));
      }
      for (const cId of counselorIds) {
        const counselorDoc = await Counselor.findById(cId).populate("userId", "_id firstName middleName lastName email role");
        if (counselorDoc) addUser((counselorDoc.userId as any));
      }

      // Parents of coach's students
      await addParentsForStudents(studentDocIds.map(id => id), seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    // ── IVY_EXPERT: super admins + assigned students + those students' admin + counselor ──
    if (userRole === USER_ROLE.IVY_EXPERT) {
      const ivyExpert = await IvyExpert.findOne({ userId });
      if (!ivyExpert) return res.status(404).json({ success: false, message: "IvyExpert record not found" });

      // Super admins
      const superAdmins = await User.find({ role: USER_ROLE.SUPER_ADMIN })
        .select("_id firstName middleName lastName email role");
      superAdmins.forEach(addUser);

      // Students assigned to this ivy expert
      const regs = await StudentServiceRegistration.find({
        $or: [
          { activeIvyExpertId: ivyExpert._id },
          { activeIvyExpertId: { $exists: false }, primaryIvyExpertId: ivyExpert._id },
          { activeIvyExpertId: null, primaryIvyExpertId: ivyExpert._id },
        ],
      }).populate({
        path: "studentId",
        populate: { path: "userId", select: "_id firstName middleName lastName email role" },
      });

      const studentDocIds: string[] = [];
      for (const reg of regs) {
        const student = reg.studentId as any;
        if (student?.userId) {
          addUser(student.userId);
          studentDocIds.push(student._id.toString());
        }
      }

      // Admin and counselor for those students
      const studentDocs = await Student.find({ _id: { $in: studentDocIds } });
      const adminIds = new Set<string>();
      const counselorIds = new Set<string>();
      for (const s of studentDocs) {
        if (s.adminId) adminIds.add(s.adminId.toString());
        if (s.counselorId) counselorIds.add(s.counselorId.toString());
      }

      for (const aId of adminIds) {
        const adminDoc = await Admin.findById(aId).populate("userId", "_id firstName middleName lastName email role");
        if (adminDoc) addUser((adminDoc.userId as any));
      }
      for (const cId of counselorIds) {
        const counselorDoc = await Counselor.findById(cId).populate("userId", "_id firstName middleName lastName email role");
        if (counselorDoc) addUser((counselorDoc.userId as any));
      }

      // Parents of ivy expert's students
      await addParentsForStudents(studentDocIds.map(id => id), seen, participants, userId!);

      return res.status(200).json({ success: true, data: { participants } });
    }

    return res.status(400).json({
      success: false,
      message: "Could not determine participants for your role",
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch participants",
    });
  }
};

/**
 * ADMIN ONLY: Get all TeamMeets for a specific counselor
 * Used in admin counselor detail view for read-only display
 */
export const getTeamMeetsForCounselor = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { counselorId } = req.params;

    // Only admin can access this endpoint
    if (userRole !== USER_ROLE.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only admins can view counselor TeamMeets",
      });
    }

    // Get the counselor to verify they exist and belong to this admin
    const counselor = await Counselor.findById(counselorId).populate("userId", "firstName middleName lastName email");
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: "Counselor not found",
      });
    }

    // Verify counselor belongs to this admin
    const admin = await Admin.findOne({ userId });
    if (!admin || counselor.adminId.toString() !== admin.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view TeamMeets for your own counselors",
      });
    }

    const counselorUserId = counselor.userId;

    // Get all TeamMeets where this counselor is a participant
    // Query using a wider date range (past 3 months to next 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 4, 0);

    const teamMeets = await TeamMeet.find({
      $or: [
        { requestedBy: (counselorUserId as any)._id },
        { requestedTo: (counselorUserId as any)._id },
        { invitedUsers: (counselorUserId as any)._id },
      ],
      scheduledDate: { $gte: threeMonthsAgo, $lte: threeMonthsLater },
    })
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { teamMeets },
    });
  } catch (error) {
    console.error("Error fetching counselor TeamMeets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch counselor TeamMeets",
    });
  }
};

/**
 * Download the attachment for a team meeting
 */
export const downloadTeamMeetAttachment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { teamMeetId } = req.params;
    const teamMeet = await TeamMeet.findById(teamMeetId);

    if (!teamMeet || !teamMeet.attachmentUrl) {
      res.status(404).json({ success: false, message: "Attachment not found" });
      return;
    }

    const filePath = path.join(process.cwd(), teamMeet.attachmentUrl);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "File not found on server" });
      return;
    }

    res.download(filePath, teamMeet.attachmentName || "attachment");
  } catch (error) {
    console.error("Error downloading team meet attachment:", error);
    res.status(500).json({ success: false, message: "Failed to download attachment" });
  }
};

/**
 * Get team meetings for a specific student (by student model ID).
 * Used by admin/counselor/super-admin/ops to view student dashboard calendar.
 */
export const getTeamMeetsForStudent = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { studentId } = req.params;

    // Find the student record to get the userId
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const studentUserId = student.userId;

    // Default to 3 months range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

    const teamMeets = await TeamMeet.find({
      $or: [{ requestedBy: studentUserId }, { requestedTo: studentUserId }, { invitedUsers: studentUserId }],
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { teamMeets },
    });
  } catch (error) {
    console.error("Error fetching team meets for student:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student team meets",
    });
  }
};

/**
 * Invite users to a team meeting
 * Only sender or receiver can invite from their participants list
 */
export const inviteToTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;
    const { userIds } = req.body; // Array of user IDs to invite

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide user IDs to invite",
      });
    }

    const teamMeet = await TeamMeet.findById(teamMeetId);
    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only sender or receiver can invite
    if (
      teamMeet.requestedBy.toString() !== userId &&
      teamMeet.requestedTo.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting sender or receiver can invite participants",
      });
    }

    // Don't allow inviting the sender or receiver themselves
    const filteredIds = userIds.filter(
      (id: string) =>
        id !== teamMeet.requestedBy.toString() &&
        id !== teamMeet.requestedTo.toString()
    );

    if (filteredIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot invite the meeting sender or receiver",
      });
    }

    // Add unique user IDs to invitedUsers
    const existingIds = (teamMeet.invitedUsers || []).map((id: any) => id.toString());
    const newIds = filteredIds.filter((id: string) => !existingIds.includes(id));

    if (newIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All selected users are already invited",
      });
    }

    teamMeet.invitedUsers = [
      ...(teamMeet.invitedUsers || []),
      ...newIds.map((id: string) => new mongoose.Types.ObjectId(id)),
    ];
    await teamMeet.save();

    // Return the updated team meet with populated fields
    const updatedTeamMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: `${newIds.length} user(s) invited successfully`,
      data: { teamMeet: updatedTeamMeet },
    });
  } catch (error) {
    console.error("Error inviting to team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to invite users",
    });
  }
};

/**
 * Remove an invited user from a team meeting
 * Only sender or receiver can remove invitees
 */
export const removeInviteFromTeamMeet = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { teamMeetId } = req.params;
    const { invitedUserId } = req.body;

    if (!invitedUserId) {
      return res.status(400).json({
        success: false,
        message: "Please provide the user ID to remove",
      });
    }

    const teamMeet = await TeamMeet.findById(teamMeetId);
    if (!teamMeet) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only sender or receiver can remove invitees
    if (
      teamMeet.requestedBy.toString() !== userId &&
      teamMeet.requestedTo.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting sender or receiver can remove invitees",
      });
    }

    teamMeet.invitedUsers = (teamMeet.invitedUsers || []).filter(
      (id: any) => id.toString() !== invitedUserId
    );
    await teamMeet.save();

    const updatedTeamMeet = await TeamMeet.findById(teamMeetId)
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .populate("invitedUsers", "firstName middleName lastName email role");

    return res.status(200).json({
      success: true,
      message: "User removed from invitation",
      data: { teamMeet: updatedTeamMeet },
    });
  } catch (error) {
    console.error("Error removing invite from team meet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove invitation",
    });
  }
};
