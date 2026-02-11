import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * @desc    Enroll student in a service
 * @route   POST /api/enrollments
 * @access  Private (Student only)
 */
export declare const enrollInService: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get all enrollments for current user
 * @route   GET /api/enrollments
 * @access  Private (Student only)
 */
export declare const getMyEnrollments: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get enrollment by ID
 * @route   GET /api/enrollments/:id
 * @access  Private (Student/Counselor/Admin)
 */
export declare const getEnrollmentById: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Update enrollment status
 * @route   PATCH /api/enrollments/:id/status
 * @access  Private (Student/Counselor/Admin)
 */
export declare const updateEnrollmentStatus: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Assign counselor to enrollment
 * @route   PATCH /api/enrollments/:id/assign-counselor
 * @access  Private (Admin only)
 */
export declare const assignCounselor: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get all enrollments (Admin/Counselor)
 * @route   GET /api/enrollments/all
 * @access  Private (Admin/Counselor only)
 */
export declare const getAllEnrollments: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get enrollments for assigned counselor
 * @route   GET /api/enrollments/my-students
 * @access  Private (Counselor only)
 */
export declare const getMyCounselingEnrollments: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=enrollmentController.d.ts.map