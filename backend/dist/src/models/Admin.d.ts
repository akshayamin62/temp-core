import mongoose, { Document } from "mongoose";
export interface IAdmin extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    mobileNumber?: string;
    companyName: string;
    address?: string;
    companyLogo?: string;
    enquiryFormSlug: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IAdmin, {}, {}, {}, mongoose.Document<unknown, {}, IAdmin, {}, {}> & IAdmin & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Admin.d.ts.map