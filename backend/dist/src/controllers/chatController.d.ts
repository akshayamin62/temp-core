import { Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare const getOrCreateChat: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getChatMessages: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyChatsList: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=chatController.d.ts.map