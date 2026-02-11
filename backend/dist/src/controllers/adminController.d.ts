import { Response } from "express";
import { AuthRequest } from "../types/auth";
/**
 * Create a new Counselor (Admin only)
 */
export declare const createCounselor: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all counselors created by the logged-in admin
 */
export declare const getCounselors: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Toggle counselor active status (Admin only)
 */
export declare const toggleCounselorStatus: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get counselor detail with dashboard data (Admin only)
 */
export declare const getCounselorDetail: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get counselor's follow-ups (Admin only)
 */
export declare const getCounselorFollowUps: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get counselor's follow-up summary (Admin only)
 */
export declare const getCounselorFollowUpSummary: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get admin dashboard stats
 */
export declare const getAdminStats: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=adminController.d.ts.map