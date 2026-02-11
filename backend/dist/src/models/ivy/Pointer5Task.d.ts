import mongoose, { Document } from 'mongoose';
export interface IPointer5Task extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    ivyExpertId: mongoose.Types.ObjectId;
    taskDescription: string;
    wordLimit: number;
    attachments: {
        fileName: string;
        fileUrl: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPointer5Task, {}, {}, {}, mongoose.Document<unknown, {}, IPointer5Task, {}, {}> & IPointer5Task & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer5Task.d.ts.map