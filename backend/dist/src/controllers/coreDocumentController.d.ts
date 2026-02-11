import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const getCOREDocumentFields: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addCOREDocumentField: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteCOREDocumentField: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=coreDocumentController.d.ts.map