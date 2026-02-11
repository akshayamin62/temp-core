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
exports.getTeamMeetsForCounselor = exports.getParticipants = exports.checkTeamMeetAvailability = exports.completeTeamMeet = exports.rescheduleTeamMeet = exports.cancelTeamMeet = exports.rejectTeamMeet = exports.acceptTeamMeet = exports.getTeamMeetById = exports.getTeamMeetsForCalendar = exports.getTeamMeets = exports.createTeamMeet = void 0;
const TeamMeet_1 = __importStar(require("../models/TeamMeet"));
const FollowUp_1 = __importDefault(require("../models/FollowUp"));
const User_1 = __importDefault(require("../models/User"));
const Counselor_1 = __importDefault(require("../models/Counselor"));
const Admin_1 = __importDefault(require("../models/Admin"));
const roles_1 = require("../types/roles");
const zohoMeeting_1 = require("../utils/zohoMeeting");
const email_1 = require("../utils/email");
/**
 * Helper: Get start and end of a day
 */
const getDayBounds = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
/**
 * Helper: Convert time string to minutes for comparison
 */
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};
/**
 * Helper: Check if two time slots overlap
 */
const doTimeSlotsOverlap = (time1, duration1, time2, duration2) => {
    const start1 = timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = timeToMinutes(time2);
    const end2 = start2 + duration2;
    return start1 < end2 && start2 < end1;
};
/**
 * Helper: Get admin ID for a user (either directly for admins, or via counselor relationship)
 */
const getAdminIdForUser = async (userId, userRole) => {
    if (userRole === roles_1.USER_ROLE.ADMIN) {
        // For admin users, the userId IS the admin's user ID
        const admin = await Admin_1.default.findOne({ userId });
        return admin ? admin.userId : null;
    }
    else if (userRole === roles_1.USER_ROLE.COUNSELOR) {
        const counselor = await Counselor_1.default.findOne({ userId });
        return counselor ? counselor.adminId : null;
    }
    return null;
};
/**
 * Helper: Check availability for a user at a specific time
 * Checks both TeamMeets and FollowUps (all statuses except CANCELLED/REJECTED for TeamMeet, only SCHEDULED for FollowUp)
 */
const checkUserAvailability = async (userId, userRole, date, time, duration, excludeTeamMeetId) => {
    const { start: dayStart, end: dayEnd } = getDayBounds(date);
    // Check TeamMeets - check PENDING_CONFIRMATION, CONFIRMED, and COMPLETED statuses
    const teamMeetQuery = {
        $or: [{ requestedBy: userId }, { requestedTo: userId }],
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: [TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION, TeamMeet_1.TEAMMEET_STATUS.CONFIRMED, TeamMeet_1.TEAMMEET_STATUS.COMPLETED] },
    };
    if (excludeTeamMeetId) {
        teamMeetQuery._id = { $ne: excludeTeamMeetId };
    }
    const existingTeamMeets = await TeamMeet_1.default.find(teamMeetQuery)
        .populate("requestedBy", "firstName middleName lastName")
        .populate("requestedTo", "firstName middleName lastName");
    for (const meet of existingTeamMeets) {
        if (doTimeSlotsOverlap(time, duration, meet.scheduledTime, meet.duration)) {
            const otherParty = meet.requestedBy._id.toString() === userId
                ? [(meet.requestedTo?.firstName), (meet.requestedTo?.middleName), (meet.requestedTo?.lastName)].filter(Boolean).join(' ')
                : [(meet.requestedBy?.firstName), (meet.requestedBy?.middleName), (meet.requestedBy?.lastName)].filter(Boolean).join(' ');
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
    if (userRole === roles_1.USER_ROLE.COUNSELOR) {
        const counselor = await Counselor_1.default.findOne({ userId });
        if (counselor) {
            const existingFollowUps = await FollowUp_1.default.find({
                counselorId: counselor._id,
                scheduledDate: { $gte: dayStart, $lte: dayEnd },
                // Check ALL statuses - any follow-up at this time blocks the slot
            }).populate("leadId", "name");
            for (const followUp of existingFollowUps) {
                if (doTimeSlotsOverlap(time, duration, followUp.scheduledTime, followUp.duration)) {
                    const leadName = followUp.leadId?.name || "Unknown Lead";
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
const createTeamMeet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { subject, scheduledDate, scheduledTime, duration, meetingType, description, requestedTo, } = req.body;
        // Validate required fields
        if (!subject || !scheduledDate || !scheduledTime || !duration || !requestedTo) {
            return res.status(400).json({
                success: false,
                message: "Subject, date, time, duration, and recipient are required",
            });
        }
        // Validate duration
        if (![15, 30, 45, 60].includes(duration)) {
            return res.status(400).json({
                success: false,
                message: "Duration must be 15, 30, 45, or 60 minutes",
            });
        }
        // Validate meeting type
        if (meetingType && !Object.values(TeamMeet_1.TEAMMEET_TYPE).includes(meetingType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid meeting type",
            });
        }
        // Check recipient exists and is admin or counselor
        const recipient = await User_1.default.findById(requestedTo);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "Recipient not found",
            });
        }
        if (![roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR].includes(recipient.role)) {
            return res.status(400).json({
                success: false,
                message: "Recipient must be an admin or counselor",
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
        const adminId = await getAdminIdForUser(userId, userRole);
        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Could not determine organization context",
            });
        }
        const scheduleDate = new Date(scheduledDate);
        // Check sender availability
        const senderAvailability = await checkUserAvailability(userId, userRole, scheduleDate, scheduledTime, duration);
        if (!senderAvailability.isAvailable) {
            return res.status(400).json({
                success: false,
                message: `You have a conflict: ${senderAvailability.conflict?.type} at ${senderAvailability.conflict?.time} with ${senderAvailability.conflict?.with}`,
            });
        }
        // Check recipient availability
        const recipientAvailability = await checkUserAvailability(requestedTo, recipient.role, scheduleDate, scheduledTime, duration);
        if (!recipientAvailability.isAvailable) {
            return res.status(400).json({
                success: false,
                message: `${[recipient.firstName, recipient.middleName, recipient.lastName].filter(Boolean).join(' ')} has a conflict: ${recipientAvailability.conflict?.type} at ${recipientAvailability.conflict?.time}`,
            });
        }
        // Create the team meeting
        const teamMeet = new TeamMeet_1.default({
            subject,
            scheduledDate: scheduleDate,
            scheduledTime,
            duration,
            meetingType: meetingType || TeamMeet_1.TEAMMEET_TYPE.ONLINE,
            description,
            requestedBy: userId,
            requestedTo,
            adminId,
            status: TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION,
        });
        // If meeting type is Online, create a Zoho Meeting
        const effectiveMeetingType = meetingType || TeamMeet_1.TEAMMEET_TYPE.ONLINE;
        if (effectiveMeetingType === TeamMeet_1.TEAMMEET_TYPE.ONLINE) {
            try {
                // Build meeting start time from date + time
                const [hours, mins] = scheduledTime.split(":").map(Number);
                const meetingStartTime = new Date(scheduleDate);
                meetingStartTime.setHours(hours, mins, 0, 0);
                // Gather participant emails
                const sender = await User_1.default.findById(userId).select("email");
                const participantEmails = [];
                if (sender?.email)
                    participantEmails.push(sender.email);
                if (recipient.email)
                    participantEmails.push(recipient.email);
                const zohoResult = await (0, zohoMeeting_1.createZohoMeeting)({
                    topic: subject,
                    startTime: meetingStartTime,
                    duration,
                    agenda: description || subject,
                    participantEmails,
                });
                teamMeet.zohoMeetingKey = zohoResult.meetingKey;
                teamMeet.zohoMeetingUrl = zohoResult.meetingUrl;
            }
            catch (zohoError) {
                console.error("⚠️  Zoho Meeting creation failed (meeting saved without link):", zohoError);
            }
        }
        await teamMeet.save();
        // Populate for response
        const populatedMeet = await TeamMeet_1.default.findById(teamMeet._id)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        // Send email notifications (non-blocking)
        const formattedDate = scheduleDate.toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
        const senderUser = await User_1.default.findById(userId).select("firstName middleName lastName email");
        const senderFullName = senderUser
            ? [senderUser.firstName, senderUser.middleName, senderUser.lastName].filter(Boolean).join(" ")
            : "A team member";
        const recipientFullName = [recipient.firstName, recipient.middleName, recipient.lastName].filter(Boolean).join(" ");
        const meetingEmailBase = {
            subject,
            date: formattedDate,
            time: scheduledTime,
            duration,
            meetingType: effectiveMeetingType === TeamMeet_1.TEAMMEET_TYPE.ONLINE ? "Online" : "Face to Face",
            meetingUrl: teamMeet.zohoMeetingUrl || undefined,
            notes: description || undefined,
        };
        // Email to recipient
        if (recipient.email) {
            (0, email_1.sendMeetingScheduledEmail)(recipient.email, recipientFullName, {
                ...meetingEmailBase,
                otherPartyName: senderFullName,
            }).catch((err) => console.error("Failed to send meeting email to recipient:", err));
        }
        // Email to sender
        if (senderUser?.email) {
            (0, email_1.sendMeetingScheduledEmail)(senderUser.email, senderFullName, {
                ...meetingEmailBase,
                otherPartyName: recipientFullName,
            }).catch((err) => console.error("Failed to send meeting email to sender:", err));
        }
        return res.status(201).json({
            success: true,
            message: "Meeting request sent successfully",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error creating team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create meeting request",
        });
    }
};
exports.createTeamMeet = createTeamMeet;
/**
 * Get all team meetings for the current user
 */
const getTeamMeets = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { status, startDate, endDate } = req.query;
        const query = {
            $or: [{ requestedBy: userId }, { requestedTo: userId }],
        };
        if (status) {
            query.status = status;
        }
        if (startDate && endDate) {
            query.scheduledDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        const teamMeets = await TeamMeet_1.default.find(query)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role")
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({
            success: true,
            data: { teamMeets },
        });
    }
    catch (error) {
        console.error("Error fetching team meets:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meetings",
        });
    }
};
exports.getTeamMeets = getTeamMeets;
/**
 * Get team meetings for calendar display
 */
const getTeamMeetsForCalendar = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { month, year } = req.query;
        let startDate;
        let endDate;
        if (month && year) {
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);
            // Expand to include 1 week before and after for calendar edge display
            startDate = new Date(yearNum, monthNum - 1, -6); // 1 week before month start
            endDate = new Date(yearNum, monthNum, 7, 23, 59, 59, 999); // 1 week after month end
        }
        else {
            // Default to 3 months range (past month + current + next month)
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
        }
        const teamMeets = await TeamMeet_1.default.find({
            $or: [{ requestedBy: userId }, { requestedTo: userId }],
            scheduledDate: { $gte: startDate, $lte: endDate },
        })
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role")
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({
            success: true,
            data: { teamMeets },
        });
    }
    catch (error) {
        console.error("Error fetching team meets for calendar:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meetings for calendar",
        });
    }
};
exports.getTeamMeetsForCalendar = getTeamMeetsForCalendar;
/**
 * Get single team meeting by ID
 */
const getTeamMeetById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { teamMeetId } = req.params;
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        if (!teamMeet) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }
        // Check if user is a participant
        if (teamMeet.requestedBy.toString() !== userId &&
            teamMeet.requestedTo.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not a participant of this meeting",
            });
        }
        return res.status(200).json({
            success: true,
            data: { teamMeet },
        });
    }
    catch (error) {
        console.error("Error fetching team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meeting",
        });
    }
};
exports.getTeamMeetById = getTeamMeetById;
/**
 * Accept a team meeting invitation
 */
const acceptTeamMeet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { teamMeetId } = req.params;
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId);
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
        if (teamMeet.status !== TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION) {
            return res.status(400).json({
                success: false,
                message: `Cannot accept a meeting with status: ${teamMeet.status}`,
            });
        }
        teamMeet.status = TeamMeet_1.TEAMMEET_STATUS.CONFIRMED;
        await teamMeet.save();
        const populatedMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        return res.status(200).json({
            success: true,
            message: "Meeting accepted successfully",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error accepting team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to accept meeting",
        });
    }
};
exports.acceptTeamMeet = acceptTeamMeet;
/**
 * Reject a team meeting invitation
 */
const rejectTeamMeet = async (req, res) => {
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
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId);
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
        if (teamMeet.status !== TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION) {
            return res.status(400).json({
                success: false,
                message: `Cannot reject a meeting with status: ${teamMeet.status}`,
            });
        }
        teamMeet.status = TeamMeet_1.TEAMMEET_STATUS.REJECTED;
        teamMeet.rejectionMessage = rejectionMessage.trim();
        await teamMeet.save();
        const populatedMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        return res.status(200).json({
            success: true,
            message: "Meeting rejected",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error rejecting team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject meeting",
        });
    }
};
exports.rejectTeamMeet = rejectTeamMeet;
/**
 * Cancel a team meeting
 */
const cancelTeamMeet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { teamMeetId } = req.params;
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId);
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
        if (![TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION, TeamMeet_1.TEAMMEET_STATUS.CONFIRMED].includes(teamMeet.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a meeting with status: ${teamMeet.status}`,
            });
        }
        teamMeet.status = TeamMeet_1.TEAMMEET_STATUS.CANCELLED;
        await teamMeet.save();
        const populatedMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        return res.status(200).json({
            success: true,
            message: "Meeting cancelled",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error cancelling team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel meeting",
        });
    }
};
exports.cancelTeamMeet = cancelTeamMeet;
/**
 * Reschedule a team meeting
 */
const rescheduleTeamMeet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { teamMeetId } = req.params;
        const { scheduledDate, scheduledTime, duration, subject, description } = req.body;
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId);
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
        if (![TeamMeet_1.TEAMMEET_STATUS.REJECTED, TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION].includes(teamMeet.status)) {
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
        const recipient = await User_1.default.findById(teamMeet.requestedTo);
        // Check sender availability
        const senderAvailability = await checkUserAvailability(userId, userRole, scheduleDate, scheduledTime, duration, teamMeetId);
        if (!senderAvailability.isAvailable) {
            return res.status(400).json({
                success: false,
                message: `You have a conflict: ${senderAvailability.conflict?.type} at ${senderAvailability.conflict?.time}`,
            });
        }
        // Check recipient availability
        const recipientAvailability = await checkUserAvailability(teamMeet.requestedTo.toString(), recipient?.role || roles_1.USER_ROLE.COUNSELOR, scheduleDate, scheduledTime, duration, teamMeetId);
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
        if (subject)
            teamMeet.subject = subject;
        if (description !== undefined)
            teamMeet.description = description;
        teamMeet.status = TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION;
        teamMeet.rejectionMessage = undefined;
        await teamMeet.save();
        const populatedMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        return res.status(200).json({
            success: true,
            message: "Meeting rescheduled successfully",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error rescheduling team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reschedule meeting",
        });
    }
};
exports.rescheduleTeamMeet = rescheduleTeamMeet;
/**
 * Mark a team meeting as completed
 */
const completeTeamMeet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { teamMeetId } = req.params;
        const teamMeet = await TeamMeet_1.default.findById(teamMeetId);
        if (!teamMeet) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }
        // Either participant can mark as completed
        if (teamMeet.requestedBy.toString() !== userId &&
            teamMeet.requestedTo.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only participants can mark this meeting as completed",
            });
        }
        // Can only complete confirmed meetings
        if (teamMeet.status !== TeamMeet_1.TEAMMEET_STATUS.CONFIRMED) {
            return res.status(400).json({
                success: false,
                message: "Only confirmed meetings can be marked as completed",
            });
        }
        // Update description if provided
        if (req.body?.description !== undefined) {
            teamMeet.description = req.body.description;
        }
        teamMeet.status = TeamMeet_1.TEAMMEET_STATUS.COMPLETED;
        teamMeet.completedAt = new Date();
        await teamMeet.save();
        const populatedMeet = await TeamMeet_1.default.findById(teamMeetId)
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role");
        return res.status(200).json({
            success: true,
            message: "Meeting marked as completed",
            data: { teamMeet: populatedMeet },
        });
    }
    catch (error) {
        console.error("Error completing team meet:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to complete meeting",
        });
    }
};
exports.completeTeamMeet = completeTeamMeet;
/**
 * Check availability for a time slot
 */
const checkTeamMeetAvailability = async (req, res) => {
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
        const scheduleDate = new Date(date);
        const durationNum = parseInt(duration);
        // Check sender availability
        const senderAvailability = await checkUserAvailability(userId, userRole, scheduleDate, time, durationNum);
        // Check recipient availability
        const recipient = await User_1.default.findById(participantId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "Participant not found",
            });
        }
        const recipientAvailability = await checkUserAvailability(participantId, recipient.role, scheduleDate, time, durationNum);
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
    }
    catch (error) {
        console.error("Error checking availability:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check availability",
        });
    }
};
exports.checkTeamMeetAvailability = checkTeamMeetAvailability;
/**
 * Get list of participants (admins and counselors) available for meetings
 */
const getParticipants = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        // Get admin ID for organization context
        const adminId = await getAdminIdForUser(userId, userRole);
        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Could not determine organization context",
            });
        }
        // Get the admin user
        const admin = await User_1.default.findById(adminId).select("_id firstName middleName lastName email role");
        // Get all counselors under this admin
        const counselors = await Counselor_1.default.find({ adminId })
            .populate("userId", "_id firstName middleName lastName email role");
        // Build participants list
        const participants = [];
        // Add admin (if not the current user)
        if (admin && admin._id.toString() !== userId) {
            participants.push({
                _id: admin._id,
                firstName: admin.firstName,
                middleName: admin.middleName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role,
            });
        }
        // Add counselors (if not the current user)
        for (const counselor of counselors) {
            const counselorUser = counselor.userId;
            if (counselorUser && counselorUser._id.toString() !== userId) {
                participants.push({
                    _id: counselorUser._id,
                    firstName: counselorUser.firstName,
                    middleName: counselorUser.middleName,
                    lastName: counselorUser.lastName,
                    email: counselorUser.email,
                    role: counselorUser.role,
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: { participants },
        });
    }
    catch (error) {
        console.error("Error fetching participants:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch participants",
        });
    }
};
exports.getParticipants = getParticipants;
/**
 * ADMIN ONLY: Get all TeamMeets for a specific counselor
 * Used in admin counselor detail view for read-only display
 */
const getTeamMeetsForCounselor = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { counselorId } = req.params;
        // Only admin can access this endpoint
        if (userRole !== roles_1.USER_ROLE.ADMIN) {
            return res.status(403).json({
                success: false,
                message: "Only admins can view counselor TeamMeets",
            });
        }
        // Get the counselor to verify they exist and belong to this admin
        const counselor = await Counselor_1.default.findById(counselorId).populate("userId", "firstName middleName lastName email");
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: "Counselor not found",
            });
        }
        // Verify counselor belongs to this admin
        const admin = await Admin_1.default.findOne({ userId });
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
        const teamMeets = await TeamMeet_1.default.find({
            $or: [
                { requestedBy: counselorUserId._id },
                { requestedTo: counselorUserId._id },
            ],
            scheduledDate: { $gte: threeMonthsAgo, $lte: threeMonthsLater },
        })
            .populate("requestedBy", "firstName middleName lastName email role")
            .populate("requestedTo", "firstName middleName lastName email role")
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({
            success: true,
            data: { teamMeets },
        });
    }
    catch (error) {
        console.error("Error fetching counselor TeamMeets:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch counselor TeamMeets",
        });
    }
};
exports.getTeamMeetsForCounselor = getTeamMeetsForCounselor;
//# sourceMappingURL=teamMeetController.js.map