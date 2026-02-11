import mongoose, { Document } from "mongoose";
export declare enum COREDocumentType {
    CORE = "CORE",
    EXTRA = "EXTRA"
}
export interface ICOREDocumentField extends Document {
    studentId: mongoose.Types.ObjectId;
    registrationId: mongoose.Types.ObjectId;
    documentName: string;
    documentKey: string;
    documentType: COREDocumentType;
    category: "PRIMARY" | "SECONDARY";
    required: boolean;
    helpText?: string;
    allowMultiple: boolean;
    order: number;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdByRole: "SUPER_ADMIN" | "OPS";
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICOREDocumentField, {}, {}, {}, mongoose.Document<unknown, {}, ICOREDocumentField, {}, {}> & ICOREDocumentField & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=COREDocumentField.d.ts.map