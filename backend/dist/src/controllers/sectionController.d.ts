import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * @desc    Create a new section
 * @route   POST /api/admin/sections
 * @access  Private (Admin only)
 */
export declare const createSection: (req: AuthRequest, res: Response) => Promise<Response>;
/**
 * @desc    Get all sections (global or all)
 * @route   GET /api/admin/sections
 * @access  Private (Admin only)
 */
export declare const getAllSections: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Get section by ID
 * @route   GET /api/admin/sections/:id
 * @access  Private (Admin only)
 */
export declare const getSectionById: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Update section (with reusability logic)
 * @route   PUT /api/admin/sections/:id
 * @access  Private (Admin only)
 */
export declare const updateSection: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Toggle section active status
 * @route   PATCH /api/sections/:id/toggle-status
 * @access  Private (Admin only)
 */
export declare const toggleSectionStatus: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Add section to service
 * @route   POST /api/admin/services/:serviceId/sections
 * @access  Private (Admin only)
 */
export declare const addSectionToService: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Remove section from service
 * @route   DELETE /api/admin/services/:serviceId/sections/:sectionId
 * @access  Private (Admin only)
 */
export declare const removeSectionFromService: (req: Request, res: Response) => Promise<Response>;
/**
 * @desc    Update section order in service
 * @route   PATCH /api/admin/services/:serviceId/sections/:sectionId/order
 * @access  Private (Admin only)
 */
export declare const updateSectionOrder: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=sectionController.d.ts.map