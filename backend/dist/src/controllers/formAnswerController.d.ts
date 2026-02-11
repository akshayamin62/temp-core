import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const saveFormAnswers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFormAnswers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProgress: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteFormAnswers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=formAnswerController.d.ts.map