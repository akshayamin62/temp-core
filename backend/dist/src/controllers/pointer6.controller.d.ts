import { Request, Response } from 'express';
/** POST /pointer6/course-list/upload (Ivy Expert only) */
export declare const uploadCourseListMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadCourseListHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/certificate/upload (Student only, multiple files) */
export declare const uploadCertificatesMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadCertificatesHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/evaluate (Ivy Expert only) */
export declare const evaluatePointer6Handler: (req: Request, res: Response) => Promise<void>;
/** GET /pointer6/status/:studentId or /pointer6/status?studentIvyServiceId=xxx */
export declare const getPointer6StatusHandler: (req: Request, res: Response) => Promise<void>;
/** PUT /pointer6/certificate/:certificateId/replace (Student only) */
export declare const replaceCertificateMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const replaceCertificateHandler: (req: Request, res: Response) => Promise<void>;
/** DELETE /pointer6/certificate/:certificateId (Student only) */
export declare const deleteCertificateHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/certificate/:certificateId/evaluate (Ivy Expert only) */
export declare const evaluateCertificateHandler: (req: Request, res: Response) => Promise<void>;
export declare const getPointer6ScoreHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/select-course - Select a course with start and end dates */
export declare const selectCourseHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/unselect-course - Unselect a course */
export declare const unselectCourseHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/upload-course-certificate - Upload certificate for selected course (Student) */
export declare const uploadCourseCertificateMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadCourseCertificateHandler: (req: Request, res: Response) => Promise<void>;
/** POST /pointer6/score-course-certificate - Score a course certificate (Ivy Expert) */
export declare const scoreCourseCertificateHandler: (req: Request, res: Response) => Promise<void>;
/** GET /pointer6/course-score - Get Pointer 6 average score */
export declare const getPointer6CourseScoreHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=pointer6.controller.d.ts.map