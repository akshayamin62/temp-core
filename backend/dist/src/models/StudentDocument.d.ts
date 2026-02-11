import mongoose, { Document } from "mongoose";
export declare enum DocumentCategory {
    PRIMARY = "PRIMARY",
    SECONDARY = "SECONDARY"
}
export declare enum DocumentStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum UploaderRole {
    STUDENT = "STUDENT",
    OPS = "OPS",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export interface IStudentDocument extends Document {
    registrationId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    documentCategory: DocumentCategory;
    documentName: string;
    documentKey: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedByRole: UploaderRole;
    status: DocumentStatus;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionMessage?: string;
    version: number;
    isCustomField: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const StudentDocument: mongoose.Model<IStudentDocument, {}, {}, {}, mongoose.Document<unknown, {}, IStudentDocument, {}, {}> & IStudentDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default StudentDocument;
//# sourceMappingURL=StudentDocument.d.ts.map