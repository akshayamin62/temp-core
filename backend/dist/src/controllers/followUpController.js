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
exports.checkTimeSlotAvailability = exports.getLeadFollowUpHistory = exports.updateFollowUp = exports.getFollowUpById = exports.getFollowUpSummary = exports.getCounselorFollowUps = exports.createFollowUp = void 0;
const FollowUp_1 = __importStar(require("../models/FollowUp"));
const Lead_1 = __importStar(require("../models/Lead"));
const Counselor_1 = __importDefault(require("../models/Counselor"));
const TeamMeet_1 = __importStar(require("../models/TeamMeet"));
const mongoose_1 = __importDefault(require("mongoose"));
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
 * COUNSELOR/ADMIN: Create a new follow-up
 */
const createFollowUp = async (req, res) => {
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
        if (userRole === roles_1.USER_ROLE.ADMIN) {
            lead = await Lead_1.default.findById(leadId).populate('assignedCounselorId');
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
        }
        else {
            // Find counselor
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: "Counselor profile not found",
                });
            }
            // Validate lead exists and is assigned to this counselor
            lead = await Lead_1.default.findOne({
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
        const existingFollowUps = await FollowUp_1.default.find({
            counselorId,
            scheduledDate: { $gte: dayStart, $lte: dayEnd },
            // Removed status filter - check ALL statuses
        }).populate('leadId', 'name');
        console.log(`Checking ${existingFollowUps.length} existing follow-ups for counselor on ${scheduledDate}`);
        for (const existing of existingFollowUps) {
            const existingLeadName = existing.leadId?.name || 'Unknown Lead';
            console.log(`Checking against: ${existing.scheduledTime} (${existing.duration}min) for lead: ${existingLeadName}`);
            if (doTimeSlotsOverlap(scheduledTime, duration, existing.scheduledTime, existing.duration)) {
                console.log('CONFLICT DETECTED!');
                return res.status(400).json({
                    success: false,
                    message: `Time slot conflicts with another follow-up scheduled at ${existing.scheduledTime} for ${existingLeadName}`,
                });
            }
        }
        // Also check TeamMeet conflicts for the counselor
        const counselor = await Counselor_1.default.findById(counselorId);
        if (counselor) {
            const existingTeamMeets = await TeamMeet_1.default.find({
                $or: [{ requestedBy: counselor.userId }, { requestedTo: counselor.userId }],
                scheduledDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: [TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION, TeamMeet_1.TEAMMEET_STATUS.CONFIRMED, TeamMeet_1.TEAMMEET_STATUS.COMPLETED] },
            }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");
            for (const meet of existingTeamMeets) {
                if (doTimeSlotsOverlap(scheduledTime, duration, meet.scheduledTime, meet.duration)) {
                    const otherUser = meet.requestedBy._id.toString() === counselor.userId?.toString()
                        ? meet.requestedTo
                        : meet.requestedBy;
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
        const existingFollowUpsForLead = await FollowUp_1.default.countDocuments({ leadId });
        const followUpNumber = existingFollowUpsForLead + 1;
        // If lead is already converted to student, lock the follow-up status
        const initialStatus = lead.stage === Lead_1.LEAD_STAGE.CONVERTED
            ? FollowUp_1.FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
            : FollowUp_1.FOLLOWUP_STATUS.SCHEDULED;
        // Create the follow-up
        const followUp = new FollowUp_1.default({
            leadId,
            counselorId,
            scheduledDate: scheduleDate,
            scheduledTime,
            duration,
            meetingType: meetingType || FollowUp_1.MEETING_TYPE.ONLINE,
            status: initialStatus,
            stageAtFollowUp: lead.stage,
            followUpNumber,
            notes: notes || "",
            createdBy: userId,
        });
        // If meeting type is Online, create a Zoho Meeting
        const effectiveMeetingType = meetingType || FollowUp_1.MEETING_TYPE.ONLINE;
        if (effectiveMeetingType === FollowUp_1.MEETING_TYPE.ONLINE) {
            try {
                // Build the meeting start time from date + time
                const [hours, mins] = scheduledTime.split(":").map(Number);
                const meetingStartTime = new Date(scheduleDate);
                meetingStartTime.setHours(hours, mins, 0, 0);
                const participantEmails = [];
                if (lead.email)
                    participantEmails.push(lead.email);
                // Get counselor's email
                const counselorDoc = await Counselor_1.default.findById(counselorId).populate("userId", "email");
                const counselorEmail = counselorDoc?.userId?.email;
                if (counselorEmail)
                    participantEmails.push(counselorEmail);
                const zohoResult = await (0, zohoMeeting_1.createZohoMeeting)({
                    topic: `Follow-up #${followUpNumber} - ${lead.name}`,
                    startTime: meetingStartTime,
                    duration,
                    agenda: notes || `Follow-up meeting with ${lead.name}`,
                    participantEmails,
                });
                followUp.zohoMeetingKey = zohoResult.meetingKey;
                followUp.zohoMeetingUrl = zohoResult.meetingUrl;
            }
            catch (zohoError) {
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
        const counselorForEmail = await Counselor_1.default.findById(counselorId).populate("userId", "email firstName middleName lastName");
        const counselorUser = counselorForEmail?.userId;
        const counselorFullName = counselorUser
            ? [counselorUser.firstName, counselorUser.middleName, counselorUser.lastName].filter(Boolean).join(" ")
            : "Your Counselor";
        // Email to lead
        if (lead.email) {
            (0, email_1.sendMeetingScheduledEmail)(lead.email, lead.name, {
                ...meetingEmailDetails,
                otherPartyName: counselorFullName,
            }).catch((err) => console.error("Failed to send meeting email to lead:", err));
        }
        // Email to counselor
        if (counselorUser?.email) {
            (0, email_1.sendMeetingScheduledEmail)(counselorUser.email, counselorFullName, {
                ...meetingEmailDetails,
                otherPartyName: lead.name,
            }).catch((err) => console.error("Failed to send meeting email to counselor:", err));
        }
        return res.status(201).json({
            success: true,
            message: "Follow-up scheduled successfully",
            data: { followUp },
        });
    }
    catch (error) {
        console.error("Error creating follow-up:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating follow-up",
        });
    }
};
exports.createFollowUp = createFollowUp;
/**
 * COUNSELOR: Get all follow-ups for counselor (calendar data)
 */
const getCounselorFollowUps = async (req, res) => {
    try {
        const counselorUserId = req.user?.userId;
        const { startDate, endDate, status } = req.query;
        const counselor = await Counselor_1.default.findOne({ userId: counselorUserId });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: "Counselor profile not found",
            });
        }
        // Build filter
        const filter = { counselorId: counselor._id };
        if (startDate && endDate) {
            filter.scheduledDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        if (status) {
            filter.status = status;
        }
        const followUps = await FollowUp_1.default.find(filter)
            .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
            .sort({ scheduledDate: 1, scheduledTime: 1 });
        return res.status(200).json({
            success: true,
            data: { followUps },
        });
    }
    catch (error) {
        console.error("Error fetching follow-ups:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching follow-ups",
        });
    }
};
exports.getCounselorFollowUps = getCounselorFollowUps;
/**
 * COUNSELOR: Get follow-up summary (Today, Missed, Upcoming)
 */
const getFollowUpSummary = async (req, res) => {
    try {
        const counselorUserId = req.user?.userId;
        const counselor = await Counselor_1.default.findOne({ userId: counselorUserId });
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
        const todayFollowUps = await FollowUp_1.default.find({
            counselorId: counselor._id,
            scheduledDate: { $gte: todayStart, $lte: todayEnd },
        })
            .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
            .sort({ scheduledTime: 1 });
        // Missed follow-ups (past date + status still SCHEDULED)
        const missedFollowUps = await FollowUp_1.default.find({
            counselorId: counselor._id,
            scheduledDate: { $lt: todayStart },
            status: FollowUp_1.FOLLOWUP_STATUS.SCHEDULED,
        })
            .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus")
            .sort({ scheduledDate: -1 });
        // Upcoming (tomorrow only)
        const upcomingFollowUps = await FollowUp_1.default.find({
            counselorId: counselor._id,
            scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
            status: FollowUp_1.FOLLOWUP_STATUS.SCHEDULED,
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
    }
    catch (error) {
        console.error("Error fetching follow-up summary:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching follow-up summary",
        });
    }
};
exports.getFollowUpSummary = getFollowUpSummary;
/**
 * COUNSELOR/ADMIN: Get follow-up by ID
 */
const getFollowUpById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { followUpId } = req.params;
        let followUp;
        // Admin and Super Admin can access any follow-up
        if (userRole === roles_1.USER_ROLE.ADMIN || userRole === roles_1.USER_ROLE.SUPER_ADMIN) {
            followUp = await FollowUp_1.default.findById(followUpId)
                .populate("leadId", "name email mobileNumber city serviceTypes stage conversionStatus");
        }
        else {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: "Counselor profile not found",
                });
            }
            followUp = await FollowUp_1.default.findOne({
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
        const totalFollowUpsForLead = await FollowUp_1.default.countDocuments({ leadId: followUp.leadId });
        // If this is not the latest follow-up, get the next follow-up's timing
        let nextFollowUpInfo = null;
        if (followUp.followUpNumber < totalFollowUpsForLead) {
            const nextFollowUp = await FollowUp_1.default.findOne({
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
    }
    catch (error) {
        console.error("Error fetching follow-up:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching follow-up",
        });
    }
};
exports.getFollowUpById = getFollowUpById;
/**
 * COUNSELOR/ADMIN: Update follow-up (complete/reschedule)
 */
const updateFollowUp = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { followUpId } = req.params;
        const { status, stageChangedTo, notes, nextFollowUp, // { scheduledDate, scheduledTime, duration }
         } = req.body;
        let followUp;
        let counselorId;
        // Admin can update any follow-up
        if (userRole === roles_1.USER_ROLE.ADMIN) {
            followUp = await FollowUp_1.default.findById(followUpId);
            if (!followUp) {
                return res.status(404).json({
                    success: false,
                    message: "Follow-up not found",
                });
            }
            counselorId = followUp.counselorId;
        }
        else {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: "Counselor profile not found",
                });
            }
            followUp = await FollowUp_1.default.findOne({
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
        const totalFollowUpsForLead = await FollowUp_1.default.countDocuments({ leadId: followUp.leadId });
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
            if (status !== FollowUp_1.FOLLOWUP_STATUS.SCHEDULED && !followUp.completedAt) {
                followUp.completedAt = new Date();
            }
        }
        if (notes !== undefined) {
            followUp.notes = notes;
        }
        followUp.updatedBy = new mongoose_1.default.Types.ObjectId(userId);
        // If stage is changed, update both follow-up and lead
        if (stageChangedTo) {
            followUp.stageChangedTo = stageChangedTo;
            // Update the lead's stage
            await Lead_1.default.findByIdAndUpdate(followUp.leadId, {
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
            const conflictingFollowUps = await FollowUp_1.default.find({
                counselorId,
                scheduledDate: { $gte: dayStart, $lte: dayEnd },
                // Removed status filter - check ALL statuses
            }).populate('leadId', 'name');
            console.log(`Checking ${conflictingFollowUps.length} existing follow-ups for next follow-up on ${nextFollowUp.scheduledDate}`);
            for (const existing of conflictingFollowUps) {
                const existingLeadName = existing.leadId?.name || 'Unknown Lead';
                console.log(`Checking against: ${existing.scheduledTime} (${existing.duration}min) for lead: ${existingLeadName}`);
                if (doTimeSlotsOverlap(nextFollowUp.scheduledTime, nextFollowUp.duration || 30, existing.scheduledTime, existing.duration)) {
                    console.log('CONFLICT DETECTED for next follow-up!');
                    return res.status(400).json({
                        success: false,
                        message: `Next follow-up time conflicts with another follow-up at ${existing.scheduledTime} for ${existingLeadName}`,
                    });
                }
            }
            // Also check TeamMeet conflicts for the counselor
            const counselorDoc = await Counselor_1.default.findById(counselorId);
            if (counselorDoc) {
                const existingTeamMeets = await TeamMeet_1.default.find({
                    $or: [{ requestedBy: counselorDoc.userId }, { requestedTo: counselorDoc.userId }],
                    scheduledDate: { $gte: dayStart, $lte: dayEnd },
                    status: { $in: [TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION, TeamMeet_1.TEAMMEET_STATUS.CONFIRMED, TeamMeet_1.TEAMMEET_STATUS.COMPLETED] },
                }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");
                for (const meet of existingTeamMeets) {
                    if (doTimeSlotsOverlap(nextFollowUp.scheduledTime, nextFollowUp.duration || 30, meet.scheduledTime, meet.duration)) {
                        const otherUser = meet.requestedBy._id.toString() === counselorDoc.userId?.toString()
                            ? meet.requestedTo
                            : meet.requestedBy;
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
            const lead = await Lead_1.default.findById(followUp.leadId);
            // Calculate followUpNumber for the next follow-up
            const existingFollowUpsCount = await FollowUp_1.default.countDocuments({ leadId: followUp.leadId });
            const nextFollowUpNumber = existingFollowUpsCount + 1;
            // If lead is already converted to student, lock the follow-up status
            const effectiveStage = stageChangedTo || lead?.stage || followUp.stageAtFollowUp;
            const nextStatus = effectiveStage === Lead_1.LEAD_STAGE.CONVERTED
                ? FollowUp_1.FOLLOWUP_STATUS.CONVERTED_TO_STUDENT
                : FollowUp_1.FOLLOWUP_STATUS.SCHEDULED;
            newFollowUp = new FollowUp_1.default({
                leadId: followUp.leadId,
                counselorId,
                scheduledDate: nextDate,
                scheduledTime: nextFollowUp.scheduledTime,
                duration: nextFollowUp.duration || 30,
                meetingType: nextFollowUp.meetingType || FollowUp_1.MEETING_TYPE.ONLINE,
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
    }
    catch (error) {
        console.error("Error updating follow-up:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating follow-up",
        });
    }
};
exports.updateFollowUp = updateFollowUp;
/**
 * COUNSELOR: Get follow-up history for a lead
 */
const getLeadFollowUpHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { leadId } = req.params;
        let lead;
        // Admin and Super Admin can access any lead's follow-up history
        if (userRole === roles_1.USER_ROLE.ADMIN || userRole === roles_1.USER_ROLE.SUPER_ADMIN) {
            lead = await Lead_1.default.findById(leadId);
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: "Lead not found",
                });
            }
        }
        else {
            // Counselor can only access assigned leads
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: "Counselor profile not found",
                });
            }
            // Verify lead is assigned to this counselor
            lead = await Lead_1.default.findOne({
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
        const followUps = await FollowUp_1.default.find({ leadId })
            .populate("createdBy", "firstName middleName lastName")
            .populate("updatedBy", "firstName middleName lastName")
            .sort({ createdAt: -1 });
        // Check if lead has an active/future follow-up
        const activeFollowUp = followUps.find((f) => f.status === FollowUp_1.FOLLOWUP_STATUS.SCHEDULED);
        return res.status(200).json({
            success: true,
            data: {
                lead,
                followUps,
                hasActiveFollowUp: !!activeFollowUp,
                activeFollowUp: activeFollowUp || null,
            },
        });
    }
    catch (error) {
        console.error("Error fetching lead follow-up history:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching follow-up history",
        });
    }
};
exports.getLeadFollowUpHistory = getLeadFollowUpHistory;
/**
 * COUNSELOR/ADMIN: Check time slot availability
 */
const checkTimeSlotAvailability = async (req, res) => {
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
        if (userRole === roles_1.USER_ROLE.ADMIN) {
            if (!leadId) {
                return res.status(400).json({
                    success: false,
                    message: "Lead ID is required for admin to check availability",
                });
            }
            const lead = await Lead_1.default.findById(leadId).populate('assignedCounselorId');
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
        }
        else {
            const counselor = await Counselor_1.default.findOne({ userId });
            if (!counselor) {
                return res.status(404).json({
                    success: false,
                    message: "Counselor profile not found",
                });
            }
            counselorId = counselor._id;
        }
        const checkDate = new Date(date);
        const { start: dayStart, end: dayEnd } = getDayBounds(checkDate);
        // Check ALL follow-ups regardless of status for this counselor on this day
        const existingFollowUps = await FollowUp_1.default.find({
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
            const existingLeadName = existing.leadId?.name || 'Unknown Lead';
            console.log(`Checking slot ${time} (${duration}min) against existing: ${existing.scheduledTime} (${existing.duration}min) for ${existingLeadName}`);
            if (doTimeSlotsOverlap(time, parseInt(duration), existing.scheduledTime, existing.duration)) {
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
            const counselorDoc = await Counselor_1.default.findById(counselorId);
            if (counselorDoc) {
                const existingTeamMeets = await TeamMeet_1.default.find({
                    $or: [{ requestedBy: counselorDoc.userId }, { requestedTo: counselorDoc.userId }],
                    scheduledDate: { $gte: dayStart, $lte: dayEnd },
                    status: { $in: [TeamMeet_1.TEAMMEET_STATUS.PENDING_CONFIRMATION, TeamMeet_1.TEAMMEET_STATUS.CONFIRMED, TeamMeet_1.TEAMMEET_STATUS.COMPLETED] },
                }).populate("requestedBy", "firstName middleName lastName").populate("requestedTo", "firstName middleName lastName");
                for (const meet of existingTeamMeets) {
                    if (doTimeSlotsOverlap(time, parseInt(duration), meet.scheduledTime, meet.duration)) {
                        const otherUser = meet.requestedBy._id.toString() === counselorDoc.userId?.toString()
                            ? meet.requestedTo
                            : meet.requestedBy;
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
    }
    catch (error) {
        console.error("Error checking time slot:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking time slot availability",
        });
    }
};
exports.checkTimeSlotAvailability = checkTimeSlotAvailability;
//# sourceMappingURL=followUpController.js.map