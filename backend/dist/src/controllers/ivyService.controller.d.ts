import { Request, Response } from 'express';
export declare const createIvyService: (req: Request, res: Response) => Promise<void>;
/**
 * Auth-based: Get students for the logged-in ivy expert.
 * Derives IvyExpert._id from req.user.userId (JWT).
 */
export declare const getMyStudentsHandler: (req: Request, res: Response) => Promise<void>;
export declare const getStudentsForIvyExpertHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateInterestHandler: (req: Request, res: Response) => Promise<void>;
export declare const getServiceDetailsHandler: (req: Request, res: Response) => Promise<void>;
export declare const getServiceByStudentIdHandler: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/ivy/ivy-service/my-service
 * Auth-based: get the logged-in student's ivy service registration
 */
export declare const getMyServiceHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ivyService.controller.d.ts.map