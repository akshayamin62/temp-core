import mongoose, { Document, Types } from 'mongoose';
export interface IPointerNotification extends Document {
    studentIvyServiceId: Types.ObjectId;
    userId: Types.ObjectId;
    userRole: 'student' | 'ivyExpert';
    pointerNumber: number;
    notificationType: string;
    referenceId?: Types.ObjectId;
    taskTitle?: string;
    taskPage?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPointerNotification, {}, {}, {}, mongoose.Document<unknown, {}, IPointerNotification, {}, {}> & IPointerNotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=PointerNotification.d.ts.map