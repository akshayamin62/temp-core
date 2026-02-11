import { Request, Response } from 'express';
/**
 * @desc    Create a new question
 * @route   POST /api/admin/questions
 * @access  Private (Admin only)
 */
export declare const createQuestion: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get all questions with filters
 * @route   GET /api/admin/questions
 * @access  Private (Admin only)
 */
export declare const getAllQuestions: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get question by ID
 * @route   GET /api/admin/questions/:id
 * @access  Private (Admin only)
 */
export declare const getQuestionById: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Update question
 * @route   PUT /api/admin/questions/:id
 * @access  Private (Admin only)
 */
export declare const updateQuestion: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Toggle question active status
 * @route   PATCH /api/questions/:id/toggle-status
 * @access  Private (Admin only)
 */
export declare const toggleQuestionStatus: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get question types and edit policies (for frontend dropdowns)
 * @route   GET /api/admin/questions/metadata
 * @access  Private (Admin only)
 */
export declare const getQuestionMetadata: (_req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=questionController.d.ts.map