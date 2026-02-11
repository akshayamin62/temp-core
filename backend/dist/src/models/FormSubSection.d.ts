import mongoose, { Document } from "mongoose";
export interface IFormSubSection extends Document {
    sectionId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    order: number;
    isRepeatable: boolean;
    isActive: boolean;
    maxRepeat?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IFormSubSection, {}, {}, {}, mongoose.Document<unknown, {}, IFormSubSection, {}, {}> & IFormSubSection & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FormSubSection.d.ts.map