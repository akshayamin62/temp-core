import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get all programs for a student (added by their assigned OPS)
 */
export declare const getStudentPrograms: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get programs for a specific student (Ops view)
 */
export declare const getOpsStudentPrograms: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get all programs for a OPS
 */
export declare const getOpsPrograms: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Create a new program (OPS)
 */
export declare const createProgram: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Student selects a program
 */
export declare const selectProgram: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Student removes a program from applied list
 */
export declare const removeProgram: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Admin updates program priority, intake, and year
 */
export declare const updateProgramSelection: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get programs for a specific student (super admin view) - only filter by studentId, not opsId
 */
export declare const getSuperAdminStudentPrograms: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Get applied programs for a student (admin view) - kept for backward compatibility
 */
export declare const getStudentAppliedPrograms: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * Upload programs from Excel file
 */
export declare const uploadProgramsFromExcel: (req: AuthRequest & {
    file?: Express.Multer.File;
}, res: Response) => Promise<Response>;
//# sourceMappingURL=programController.d.ts.map