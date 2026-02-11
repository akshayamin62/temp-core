import mongoose, { Document } from "mongoose";
export interface ICounselor extends Document {
    userId: mongoose.Types.ObjectId;
    adminId: mongoose.Types.ObjectId;
    email: string;
    mobileNumber?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<ICounselor, {}, {}, {}, mongoose.Document<unknown, {}, ICounselor, {}, {}> & ICounselor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Counselor.d.ts.map