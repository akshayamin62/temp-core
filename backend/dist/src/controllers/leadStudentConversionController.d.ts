import { Response } from "express";
import { AuthRequest } from "../types/auth";
/**
 * Request conversion of lead to student (Counselor)
 */
export declare const requestConversion: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all pending conversion requests (Admin)
 */
export declare const getPendingConversions: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Approve conversion request (Admin)
 */
export declare const approveConversion: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Reject conversion request (Admin)
 */
export declare const rejectConversion: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get conversion history for a lead (Admin/Counselor)
 */
export declare const getConversionHistory: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all conversions (Super Admin)
 */
export declare const getAllConversions: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=leadStudentConversionController.d.ts.map