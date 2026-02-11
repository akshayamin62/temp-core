import mongoose, { Document } from 'mongoose';
export interface ITaskMessage {
    sender: 'student' | 'ivyExpert';
    senderName: string;
    text: string;
    timestamp: Date;
    messageType?: 'normal' | 'feedback' | 'action' | 'resource';
    attachment?: {
        name: string;
        url: string;
        size: string;
    };
}
export interface ITaskConversation extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    selectionId: mongoose.Types.ObjectId;
    taskTitle: string;
    taskPage?: string;
    messages: ITaskMessage[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITaskConversation, {}, {}, {}, mongoose.Document<unknown, {}, ITaskConversation, {}, {}> & ITaskConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TaskConversation.d.ts.map