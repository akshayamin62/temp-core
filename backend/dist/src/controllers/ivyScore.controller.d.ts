import { Request, Response } from 'express';
/**
 * GET /api/ivy-score/:studentId
 * Get Ivy readiness score for a student
 */
export declare const getStudentIvyScore: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/ivy-score/recalculate/:studentId
 * Manually recalculate Ivy score for a student
 */
/**
 * GET /api/ivy/ivy-score/my-score
 * Auth-based: get the logged-in student's ivy score
 */
export declare const getMyIvyScore: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const recalculateIvyScore: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ivyScore.controller.d.ts.map