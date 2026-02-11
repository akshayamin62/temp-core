import mongoose, { Document } from "mongoose";
export interface IServiceFormPart extends Document {
    serviceId: mongoose.Types.ObjectId;
    partId: mongoose.Types.ObjectId;
    order: number;
    isActive: boolean;
    isRequired: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IServiceFormPart, {}, {}, {}, mongoose.Document<unknown, {}, IServiceFormPart, {}, {}> & IServiceFormPart & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ServiceFormPart.d.ts.map