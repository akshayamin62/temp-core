import mongoose, { Document } from "mongoose";
export interface IEduplanCoach extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    mobileNumber?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IEduplanCoach, {}, {}, {}, mongoose.Document<unknown, {}, IEduplanCoach, {}, {}> & IEduplanCoach & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=EduplanCoach.d.ts.map