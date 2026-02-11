import mongoose, { Document } from "mongoose";
export interface IService extends Document {
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    icon?: string;
    learnMoreUrl?: string;
    isActive: boolean;
    order: number;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IService, {}, {}, {}, mongoose.Document<unknown, {}, IService, {}, {}> & IService & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Service.d.ts.map