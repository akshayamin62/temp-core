import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get all students for the admin (students converted under this admin)
 * Admin can only see students that were converted under their admin
 */
export declare const getAdminStudents: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get student details (read-only for admin)
 */
export declare const getAdminStudentDetails: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get student form answers for a registration (read-only for admin)
 */
export declare const getAdminStudentFormAnswers: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get student by lead ID (for converted leads)
 */
export declare const getStudentByLeadId: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=adminStudentController.d.ts.map