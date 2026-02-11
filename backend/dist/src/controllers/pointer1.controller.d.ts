import { Request, Response } from 'express';
export declare const academicUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadAcademicDocumentHandler: (req: Request, res: Response) => Promise<void>;
export declare const evaluateAcademicHandler: (req: Request, res: Response) => Promise<void>;
export declare const getAcademicStatusHandler: (req: Request, res: Response) => Promise<void>;
export declare const getAcademicDataHandler: (req: Request, res: Response) => Promise<void>;
export declare const addSectionHandler: (req: Request, res: Response) => Promise<void>;
export declare const addSubSectionHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateSubSectionHandler: (req: Request, res: Response) => Promise<void>;
export declare const addSubjectHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateSubjectHandler: (req: Request, res: Response) => Promise<void>;
export declare const deleteSectionHandler: (req: Request, res: Response) => Promise<void>;
export declare const deleteSubSectionHandler: (req: Request, res: Response) => Promise<void>;
export declare const deleteSubjectHandler: (req: Request, res: Response) => Promise<void>;
export declare const updateWeightagesHandler: (req: Request, res: Response) => Promise<void>;
export declare const getAcademicExcellenceScoreHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=pointer1.controller.d.ts.map