import mongoose, { Document } from "mongoose";
export interface IFormSection extends Document {
    partId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    order: number;
    isActive: boolean;
    isRepeatable?: boolean;
    minRepeats?: number;
    maxRepeats?: number;
    questions?: any[];
    isGlobal?: boolean;
    usedInServices?: any[];
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IFormSection, {}, {}, {}, mongoose.Document<unknown, {}, IFormSection, {}, {}> & IFormSection & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FormSection.d.ts.map