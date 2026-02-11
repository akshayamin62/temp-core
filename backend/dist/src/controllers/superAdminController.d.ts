import { Request, Response } from "express";
/**
 * Get all users with optional filters
 */
export declare const getAllUsers: (req: Request, res: Response) => Promise<Response>;
/**
 * Get user statistics
 */
export declare const getUserStats: (_req: Request, res: Response) => Promise<Response>;
/**
 * Approve user (for OPS, alumni, service provider)
 */
export declare const approveUser: (req: Request, res: Response) => Promise<Response | void>;
/**
 * Reject user approval
 */
export declare const rejectUser: (req: Request, res: Response) => Promise<Response | void>;
/**
 * Toggle user active status
 */
export declare const toggleUserStatus: (req: Request, res: Response) => Promise<Response | void>;
/**
 * Delete user
 */
export declare const deleteUser: (req: Request, res: Response) => Promise<Response | void>;
/**
 * Get pending approvals
 */
export declare const getPendingApprovals: (_req: Request, res: Response) => Promise<Response>;
/**
 * Create a new ops (admin only)
 */
export declare const createOps: (req: Request, res: Response) => Promise<Response>;
/**
 * Get all ops
 */
export declare const getAllOps: (_req: Request, res: Response) => Promise<Response>;
/**
 * Get all Ivy Experts
 */
export declare const getAllIvyExperts: (_req: Request, res: Response) => Promise<Response>;
/**
 * Get all Eduplan Coaches
 */
export declare const getAllEduplanCoaches: (_req: Request, res: Response) => Promise<Response>;
/**
 * Create a new Admin
 */
export declare const createAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get all admins for dropdown selection
 */
export declare const getAdmins: (_req: Request, res: Response) => Promise<Response>;
/**
 * Get admin details by admin user ID
 */
export declare const getAdminDetails: (req: Request, res: Response) => Promise<Response>;
/**
 * Create a new User by Role (generic function for all roles)
 * This allows Super Admin to create users with any role
 */
export declare const createUserByRole: (req: Request, res: Response) => Promise<Response>;
/**
 * Get admin dashboard stats (for super admin to view a specific admin's dashboard)
 */
export declare const getAdminDashboardStats: (req: Request, res: Response) => Promise<Response>;
/**
 * Get counselors under a specific admin (for super admin)
 */
export declare const getAdminCounselorsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get leads under a specific admin (for super admin)
 */
export declare const getAdminLeadsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get students under a specific admin (for super admin)
 */
export declare const getAdminStudentsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get team meets for a specific admin (for super admin - read only)
 */
export declare const getAdminTeamMeetsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get all leads across all admins (for super admin)
 */
export declare const getAllLeadsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get counselor detail with dashboard data (for super admin)
 */
export declare const getCounselorDetailForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get counselor's follow-ups (for super admin)
 */
export declare const getCounselorFollowUpsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get counselor's follow-up summary (for super admin)
 */
export declare const getCounselorFollowUpSummaryForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
/**
 * Get counselor's team meets (for super admin)
 */
export declare const getCounselorTeamMeetsForSuperAdmin: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=superAdminController.d.ts.map