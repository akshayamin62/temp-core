import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get all students with their registrations
 * For ops: only show students assigned to them
 * For admins: show all students
 */
export declare const getAllStudents: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get student details with all registrations
 * For ops: only show details if they are active OPS for at least one registration
 */
export declare const getStudentDetails: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get student form answers for a specific registration
 * For ops: only allow access if they are the active OPS
 */
export declare const getStudentFormAnswers: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Update student form answers (admin/OPS can edit)
 */
export declare const updateStudentFormAnswers: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all students with service registrations (for dropdown/selection)
 */
export declare const getStudentsWithRegistrations: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Assign role (OPS/IvyExpert/EduplanCoach) to a student service registration
 * Based on service type:
 * - Study Abroad -> OPS
 * - Ivy League Preparation -> IVY_EXPERT
 * - Education Planning -> EDUPLAN_COACH
 */
export declare const assignOps: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Switch active role between primary and secondary
 * Works for OPS, IvyExpert, and EduplanCoach based on service type
 */
export declare const switchActiveOps: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=superAdminStudentController.d.ts.map