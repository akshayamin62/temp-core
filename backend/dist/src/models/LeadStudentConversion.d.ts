import mongoose, { Document, Types } from 'mongoose';
export declare enum CONVERSION_STATUS {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export interface ILeadStudentConversion extends Document {
    leadId: Types.ObjectId;
    requestedBy: Types.ObjectId;
    adminId: Types.ObjectId;
    status: CONVERSION_STATUS;
    rejectionReason?: string;
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: Types.ObjectId;
    rejectedAt?: Date;
    createdStudentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ILeadStudentConversion, {}, {}, {}, mongoose.Document<unknown, {}, ILeadStudentConversion, {}, {}> & ILeadStudentConversion & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=LeadStudentConversion.d.ts.map