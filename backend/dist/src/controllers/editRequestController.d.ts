import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * @desc    Create edit request
 * @route   POST /api/edit-requests
 * @access  Private (Student/Counselor)
 */
export declare const createEditRequest: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get pending edit requests (for approver)
 * @route   GET /api/edit-requests/pending
 * @access  Private (Counselor/Admin)
 */
export declare const getPendingEditRequests: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get my edit requests (student view)
 * @route   GET /api/edit-requests/my-requests
 * @access  Private (Student only)
 */
export declare const getMyEditRequests: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Approve edit request
 * @route   PATCH /api/edit-requests/:id/approve
 * @access  Private (Counselor/Admin)
 */
export declare const approveEditRequest: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Reject edit request
 * @route   PATCH /api/edit-requests/:id/reject
 * @access  Private (Counselor/Admin)
 */
export declare const rejectEditRequest: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get all edit requests (Admin view)
 * @route   GET /api/edit-requests
 * @access  Private (Admin only)
 */
export declare const getAllEditRequests: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=editRequestController.d.ts.map