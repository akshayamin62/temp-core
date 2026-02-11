import { Response } from "express";
import { AuthRequest } from "../types/auth";
/**
 * COUNSELOR/ADMIN: Create a new follow-up
 */
export declare const createFollowUp: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR: Get all follow-ups for counselor (calendar data)
 */
export declare const getCounselorFollowUps: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR: Get follow-up summary (Today, Missed, Upcoming)
 */
export declare const getFollowUpSummary: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR/ADMIN: Get follow-up by ID
 */
export declare const getFollowUpById: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR/ADMIN: Update follow-up (complete/reschedule)
 */
export declare const updateFollowUp: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR: Get follow-up history for a lead
 */
export declare const getLeadFollowUpHistory: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR/ADMIN: Check time slot availability
 */
export declare const checkTimeSlotAvailability: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=followUpController.d.ts.map