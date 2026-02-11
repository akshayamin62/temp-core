import mongoose, { Document } from 'mongoose';
export interface IActivity extends Document {
    name: string;
    pointerNo: 2 | 3 | 4;
    documentUrl: string;
    documentName: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IActivity, {}, {}, {}, mongoose.Document<unknown, {}, IActivity, {}, {}> & IActivity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Activity.d.ts.map