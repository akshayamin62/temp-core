import mongoose, { Document } from "mongoose";
export declare enum FormPartKey {
    PROFILE = "PROFILE",
    APPLICATION = "APPLICATION",
    DOCUMENT = "DOCUMENT",
    PAYMENT = "PAYMENT"
}
export interface IFormPart extends Document {
    key: string;
    title: string;
    description?: string;
    order: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IFormPart, {}, {}, {}, mongoose.Document<unknown, {}, IFormPart, {}, {}> & IFormPart & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FormPart.d.ts.map