import { Request, Response } from 'express';
export declare const activityFileUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const createActivity: (req: Request, res: Response) => Promise<void>;
export declare const getActivities: (req: Request, res: Response) => Promise<void>;
export declare const getActivityById: (req: Request, res: Response) => Promise<void>;
export declare const deleteActivity: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=activity.controller.d.ts.map