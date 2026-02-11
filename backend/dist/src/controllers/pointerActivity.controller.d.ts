import { Request, Response } from 'express';
export declare const proofUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const ivyExpertDocsMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const selectActivitiesHandler: (req: Request, res: Response) => Promise<void>;
export declare const getStudentActivitiesHandler: (req: Request, res: Response) => Promise<void>;
export declare const uploadProofHandler: (req: Request, res: Response) => Promise<void>;
export declare const evaluateActivityHandler: (req: Request, res: Response) => Promise<void>;
export declare const uploadIvyExpertDocumentsHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateDocumentTaskStatusHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateWeightagesHandler: (req: Request, res: Response) => Promise<void>;
export declare const getPointerActivityScoreHandler: (req: Request, res: Response) => Promise<void>;
export declare const setDeadlineHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=pointerActivity.controller.d.ts.map