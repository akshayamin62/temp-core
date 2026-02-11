import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const getDocumentFields: (_req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addDocumentField: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteDocumentField: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=formFieldController.d.ts.map