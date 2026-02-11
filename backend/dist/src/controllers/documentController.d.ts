import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const uploadDocument: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDocuments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const downloadDocument: (req: AuthRequest, res: Response) => Promise<void | Response<any, Record<string, any>>>;
export declare const viewDocument: (req: AuthRequest, res: Response) => Promise<void>;
export declare const approveDocument: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectDocument: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addCustomField: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteDocument: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=documentController.d.ts.map