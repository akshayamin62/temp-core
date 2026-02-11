import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * @desc    Save/Update answer for a question
 * @route   POST /api/answers/save
 * @access  Private (Student only)
 */
/**
 * @desc    Save entire section answers at once (bulk save)
 * @route   POST /api/answers/save-section
 * @access  Private (Student only)
 */
export declare const saveSectionAnswers: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const saveAnswer: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get answers for a service (with auto-fill from other services)
 * @route   GET /api/answers/service/:serviceId
 * @access  Private (Student only)
 */
export declare const getServiceAnswers: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Add new instance of repeatable section
 * @route   POST /api/answers/add-section-instance
 * @access  Private (Student only)
 */
export declare const addSectionInstance: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Remove instance of repeatable section
 * @route   DELETE /api/answers/remove-section-instance
 * @access  Private (Student only)
 */
export declare const removeSectionInstance: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Submit form (mark enrollment as submitted)
 * @route   POST /api/answers/submit
 * @access  Private (Student only)
 */
export declare const submitForm: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get all answers for a student (Admin/Counselor view)
 * @route   GET /api/answers/student/:studentId
 * @access  Private (Admin/Counselor only)
 */
export declare const getStudentAnswers: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=answerController.d.ts.map