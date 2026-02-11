import { Request, Response } from 'express';
/**
 * POST /pointer/activity/select
 * Ivy Expert selects activities
 */
export declare const selectActivitiesHandler: (req: Request, res: Response) => Promise<void>;
/**
 * GET /pointer/activity/student/:studentId
 * Get all activities for a student with status
 */
export declare const getStudentActivitiesHandler: (req: Request, res: Response) => Promise<void>;
/**
 * POST /pointer/activity/proof/upload
 * Student uploads proof for an activity
 */
export declare const uploadProofMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadProofHandler: (req: Request, res: Response) => Promise<void>;
/**
 * POST /pointer/activity/evaluate
 * Ivy Expert evaluates an activity
 */
export declare const evaluateActivityHandler: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /pointer/activity/weightages
 * Ivy Expert updates weightages for selected activities
 */
export declare const updateWeightagesHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=pointer234Activity.controller.d.ts.map