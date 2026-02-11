import { Document, Types } from 'mongoose';
export declare enum EditRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum RequestedByRole {
    STUDENT = "STUDENT",
    COUNSELOR = "COUNSELOR"
}
export declare enum ApprovedByRole {
    COUNSELOR = "COUNSELOR",
    ADMIN = "ADMIN"
}
export interface IEditRequest extends Document {
    _id: Types.ObjectId;
    student: Types.ObjectId;
    service: Types.ObjectId;
    section: Types.ObjectId;
    sectionInstanceId: string;
    question: Types.ObjectId;
    currentValue: any;
    requestedValue: any;
    requestedBy: RequestedByRole;
    requestedByUser: Types.ObjectId;
    status: EditRequestStatus;
    approvedBy?: ApprovedByRole;
    approvedByUser?: Types.ObjectId;
    reason?: string;
    rejectionReason?: string;
    resolvedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const EditRequest: import("mongoose").Model<IEditRequest, {}, {}, {}, Document<unknown, {}, IEditRequest, {}, {}> & IEditRequest & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=EditRequest.d.ts.map