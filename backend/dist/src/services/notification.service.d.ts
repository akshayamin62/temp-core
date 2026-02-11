import { Types } from 'mongoose';
interface CreateNotificationParams {
    studentIvyServiceId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    userRole: 'student' | 'ivyExpert';
    pointerNumber: number;
    notificationType: string;
    referenceId?: string | Types.ObjectId;
    taskTitle?: string;
    taskPage?: string;
}
export declare const createNotification: (params: CreateNotificationParams) => Promise<import("mongoose").Document<unknown, {}, import("../models/ivy/PointerNotification").IPointerNotification, {}, {}> & import("../models/ivy/PointerNotification").IPointerNotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const getUnreadCountsByPointer: (userId: string | Types.ObjectId) => Promise<{
    [key: number]: number;
}>;
export declare const getTotalUnreadCount: (userId: string | Types.ObjectId) => Promise<number>;
export declare const markAsRead: (notificationIds: string[] | Types.ObjectId[]) => Promise<void>;
export declare const markPointerAsRead: (userId: string | Types.ObjectId, pointerNumber: number) => Promise<void>;
export declare const getNotificationsByPointer: (userId: string | Types.ObjectId, pointerNumber: number, limit?: number) => Promise<(import("mongoose").Document<unknown, {}, import("../models/ivy/PointerNotification").IPointerNotification, {}, {}> & import("../models/ivy/PointerNotification").IPointerNotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
})[]>;
export declare const getTaskUnreadCount: (userId: string | Types.ObjectId, referenceId: string | Types.ObjectId, taskTitle: string, taskPage: string) => Promise<number>;
export declare const getBulkTaskUnreadCounts: (userId: string | Types.ObjectId, tasks: Array<{
    referenceId: string;
    taskTitle: string;
    taskPage: string;
}>) => Promise<{
    referenceId: string;
    taskTitle: string;
    taskPage: string;
    count: any;
}[]>;
export declare const markTaskAsRead: (userId: string | Types.ObjectId, referenceId: string | Types.ObjectId, taskTitle: string, taskPage: string) => Promise<void>;
export {};
//# sourceMappingURL=notification.service.d.ts.map