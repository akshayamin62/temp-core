"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teamMeetController_1 = require("../controllers/teamMeetController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// ADMIN, COUNSELOR, and SUPER_ADMIN can access TeamMeet features
router.use((0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.SUPER_ADMIN]));
/**
 * @route   POST /api/team-meets
 * @desc    Create a new team meeting request
 * @access  Admin, Counselor
 * @body    subject, scheduledDate, scheduledTime, duration, meetingType, description, requestedTo
 */
router.post("/", teamMeetController_1.createTeamMeet);
/**
 * @route   GET /api/team-meets
 * @desc    Get all team meetings for the current user (as sender or recipient)
 * @access  Admin, Counselor
 * @query   status, startDate, endDate
 */
router.get("/", teamMeetController_1.getTeamMeets);
/**
 * @route   GET /api/team-meets/calendar
 * @desc    Get team meetings formatted for calendar display
 * @access  Admin, Counselor
 * @query   month, year
 */
router.get("/calendar", teamMeetController_1.getTeamMeetsForCalendar);
/**
 * @route   GET /api/team-meets/check-availability
 * @desc    Check if a time slot is available for both parties
 * @access  Admin, Counselor
 * @query   date, time, duration, participantId
 */
router.get("/check-availability", teamMeetController_1.checkTeamMeetAvailability);
/**
 * @route   GET /api/team-meets/participants
 * @desc    Get list of admins and counselors available for meetings
 * @access  Admin, Counselor
 */
router.get("/participants", teamMeetController_1.getParticipants);
/**
 * @route   GET /api/team-meets/:teamMeetId
 * @desc    Get single team meeting details
 * @access  Admin, Counselor (only if participant)
 */
router.get("/:teamMeetId", teamMeetController_1.getTeamMeetById);
/**
 * @route   PATCH /api/team-meets/:teamMeetId/accept
 * @desc    Accept a team meeting invitation
 * @access  Only the recipient
 */
router.patch("/:teamMeetId/accept", teamMeetController_1.acceptTeamMeet);
/**
 * @route   PATCH /api/team-meets/:teamMeetId/reject
 * @desc    Reject a team meeting invitation with a message
 * @access  Only the recipient
 * @body    rejectionMessage
 */
router.patch("/:teamMeetId/reject", teamMeetController_1.rejectTeamMeet);
/**
 * @route   PATCH /api/team-meets/:teamMeetId/cancel
 * @desc    Cancel a team meeting
 * @access  Only the sender
 */
router.patch("/:teamMeetId/cancel", teamMeetController_1.cancelTeamMeet);
/**
 * @route   PATCH /api/team-meets/:teamMeetId/reschedule
 * @desc    Reschedule a rejected or pending team meeting
 * @access  Only the sender
 * @body    scheduledDate, scheduledTime, duration, subject, description (optional)
 */
router.patch("/:teamMeetId/reschedule", teamMeetController_1.rescheduleTeamMeet);
/**
 * @route   PATCH /api/team-meets/:teamMeetId/complete
 * @desc    Mark a team meeting as completed
 * @access  Either sender or recipient
 */
router.patch("/:teamMeetId/complete", teamMeetController_1.completeTeamMeet);
/**
 * @route   GET /api/team-meets/counselor/:counselorId
 * @desc    Admin-only: Get all TeamMeets for a specific counselor (read-only)
 * @access  Admin only
 */
router.get("/counselor/:counselorId", teamMeetController_1.getTeamMeetsForCounselor);
exports.default = router;
//# sourceMappingURL=teamMeetRoutes.js.map