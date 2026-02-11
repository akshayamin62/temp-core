import mongoose, { Document } from "mongoose";
export interface IStudent extends Document {
    userId: mongoose.Types.ObjectId;
    adminId?: mongoose.Types.ObjectId;
    counselorId?: mongoose.Types.ObjectId;
    email?: string;
    mobileNumber?: string;
    convertedFromLeadId?: mongoose.Types.ObjectId;
    conversionDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IStudent, {}, {}, {}, mongoose.Document<unknown, {}, IStudent, {}, {}> & IStudent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Student.d.ts.map