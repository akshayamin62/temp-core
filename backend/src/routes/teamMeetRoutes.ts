import { Router } from "express";
import {
  createTeamMeet,
  getTeamMeets,
  getTeamMeetsForCalendar,
  getTeamMeetById,
  acceptTeamMeet,
  rejectTeamMeet,
  cancelTeamMeet,
  rescheduleTeamMeet,
  checkTeamMeetAvailability,
  getParticipants,
  completeTeamMeet,
  getTeamMeetsForCounselor,
  downloadTeamMeetAttachment,
  getTeamMeetsForStudent,
  inviteToTeamMeet,
  removeInviteFromTeamMeet,
} from "../controllers/teamMeetController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { checkAdvisorStudentAccess } from "../middleware/advisorStudentOwnership";
import { upload, handleMulterError } from "../middleware/upload";

const router = Router();

// All routes require authentication
router.use(authenticate);

// BY DESIGN: All authenticated roles can create, cancel, reschedule, and complete team meetings
router.use(authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISOR]));

/**
 * @route   POST /api/team-meets
 * @desc    Create a new team meeting request
 * @access  Admin, Counselor
 * @body    subject, scheduledDate, scheduledTime, duration, meetingType, description, requestedTo
 * @file    attachment (optional, multipart/form-data)
 */
router.post("/", upload.single('attachment'), handleMulterError, createTeamMeet);

/**
 * @route   GET /api/team-meets
 * @desc    Get all team meetings for the current user (as sender or recipient)
 * @access  Admin, Counselor
 * @query   status, startDate, endDate
 */
router.get("/", getTeamMeets);

/**
 * @route   GET /api/team-meets/calendar
 * @desc    Get team meetings formatted for calendar display
 * @access  Admin, Counselor
 * @query   month, year
 */
router.get("/calendar", getTeamMeetsForCalendar);

/**
 * @route   GET /api/team-meets/check-availability
 * @desc    Check if a time slot is available for both parties
 * @access  Admin, Counselor
 * @query   date, time, duration, participantId
 */
router.get("/check-availability", checkTeamMeetAvailability);

/**
 * @route   GET /api/team-meets/participants
 * @desc    Get list of admins and counselors available for meetings
 * @access  Admin, Counselor
 */
router.get("/participants", getParticipants);

/**
 * @route   GET /api/team-meets/student/:studentId
 * @desc    Get team meetings for a specific student (for admin/counselor/super-admin/ops dashboard)
 * @access  Admin, Counselor, Super Admin, OPS
 */
router.get("/student/:studentId", authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISOR]), checkAdvisorStudentAccess, getTeamMeetsForStudent);

/**
 * @route   GET /api/team-meets/counselor/:counselorId
 * @desc    Get all TeamMeets for a specific counselor
 * @access  All authenticated roles (controlled by router-level authorize)
 */
router.get("/counselor/:counselorId", getTeamMeetsForCounselor);

/**
 * @route   GET /api/team-meets/:teamMeetId/attachment
 * @desc    Download the attachment file for a team meeting
 * @access  Admin, Counselor (only if participant)
 */
router.get("/:teamMeetId/attachment", downloadTeamMeetAttachment);

/**
 * @route   GET /api/team-meets/:teamMeetId
 * @desc    Get single team meeting details
 * @access  Admin, Counselor (only if participant)
 */
router.get("/:teamMeetId", getTeamMeetById);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/accept
 * @desc    Accept a team meeting invitation
 * @access  Only the recipient
 */
router.patch("/:teamMeetId/accept", acceptTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/reject
 * @desc    Reject a team meeting invitation with a message
 * @access  Only the recipient
 * @body    rejectionMessage
 */
router.patch("/:teamMeetId/reject", rejectTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/cancel
 * @desc    Cancel a team meeting
 * @access  Only the sender
 */
router.patch("/:teamMeetId/cancel", cancelTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/reschedule
 * @desc    Reschedule a rejected or pending team meeting
 * @access  Only the sender
 * @body    scheduledDate, scheduledTime, duration, subject, description (optional)
 */
router.patch("/:teamMeetId/reschedule", rescheduleTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/complete
 * @desc    Mark a team meeting as completed
 * @access  Either sender or recipient
 */
router.patch("/:teamMeetId/complete", completeTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/invite
 * @desc    Invite users to a team meeting
 * @access  Only sender or receiver
 * @body    userIds (array of user IDs)
 */
router.patch("/:teamMeetId/invite", inviteToTeamMeet);

/**
 * @route   PATCH /api/team-meets/:teamMeetId/remove-invite
 * @desc    Remove an invited user from a team meeting
 * @access  Only sender or receiver
 * @body    invitedUserId
 */
router.patch("/:teamMeetId/remove-invite", removeInviteFromTeamMeet);

export default router;
