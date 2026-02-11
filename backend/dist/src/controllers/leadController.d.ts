import { Response } from "express";
import { AuthRequest } from "../types/auth";
import { Request } from "express";
/**
 * Generate a unique slug from a name
 */
export declare const generateSlug: (name: string) => string;
/**
 * Check if slug exists and return a unique version
 */
export declare const getUniqueSlug: (baseSlug: string) => Promise<string>;
/**
 * PUBLIC: Submit enquiry form (no auth required)
 */
export declare const submitEnquiry: (req: Request, res: Response) => Promise<Response>;
/**
 * PUBLIC: Get admin info for enquiry form
 */
export declare const getAdminInfoBySlug: (req: Request, res: Response) => Promise<Response>;
/**
 * ADMIN: Get all leads for this admin
 */
export declare const getAdminLeads: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN: Get single lead detail
 */
export declare const getLeadDetail: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN: Assign lead to counselor
 */
export declare const assignLeadToCounselor: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN/COUNSELOR: Update lead stage
 */
export declare const updateLeadStage: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN: Get counselors for assignment dropdown
 */
export declare const getAdminCounselors: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR: Get assigned leads
 */
export declare const getCounselorLeads: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * ADMIN: Get enquiry form URL
 */
export declare const getEnquiryFormUrl: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * COUNSELOR: Get enquiry form URL (their admin's URL)
 */
export declare const getCounselorEnquiryFormUrl: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * SUPER_ADMIN: Get all leads (for analytics)
 */
export declare const getAllLeads: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=leadController.d.ts.map