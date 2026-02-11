import { Request, Response } from 'express';
export declare const messageFileUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Get conversation for a specific task
 */
export declare const getTaskConversation: (req: Request, res: Response) => Promise<void>;
/**
 * Add a message to task conversation
 */
export declare const addTaskMessage: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=taskConversation.controller.d.ts.map