import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const getStudentProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateStudentProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteStudentProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=studentController.d.ts.map