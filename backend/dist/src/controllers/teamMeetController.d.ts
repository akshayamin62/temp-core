import { Response } from "express";
import { AuthRequest } from "../types/auth";
/**
 * Create a new team meeting request
 */
export declare const createTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all team meetings for the current user
 */
export declare const getTeamMeets: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get team meetings for calendar display
 */
export declare const getTeamMeetsForCalendar: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get single team meeting by ID
 */
export declare const getTeamMeetById: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Accept a team meeting invitation
 */
export declare const acceptTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Reject a team meeting invitation
 */
export declare const rejectTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Cancel a team meeting
 */
export declare const cancelTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Reschedule a team meeting
 */
export declare const rescheduleTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Mark a team meeting as completed
 */
export declare const completeTeamMeet: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Check availability for a time slot
 */
export declare const checkTeamMeetAvailability: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get list of participants (admins and counselors) available for meetings
 */
export declare const getParticipants: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN ONLY: Get all TeamMeets for a specific counselor
 * Used in admin counselor detail view for read-only display
 */
export declare const getTeamMeetsForCounselor: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=teamMeetController.d.ts.map