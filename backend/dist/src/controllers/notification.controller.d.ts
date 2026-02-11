import { Request, Response } from 'express';
export declare const getUnreadCounts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markPointerAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getNotificationsByPointer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTaskUnreadCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markTaskAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBulkTaskUnreadCounts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notification.controller.d.ts.map