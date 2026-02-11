import mongoose, { Document } from "mongoose";
export interface IIvyExpert extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    mobileNumber?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IIvyExpert, {}, {}, {}, mongoose.Document<unknown, {}, IIvyExpert, {}, {}> & IIvyExpert & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=IvyExpert.d.ts.map