import { Request, Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const getAllServices: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyServices: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const registerForService: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getServiceForm: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getRegistrationDetails: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=serviceController.d.ts.map