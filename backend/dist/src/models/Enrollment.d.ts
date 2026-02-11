import { Document, Types } from 'mongoose';
export declare enum EnrollmentStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    SUBMITTED = "submitted",
    COMPLETED = "completed"
}
export interface IEnrollment extends Document {
    _id: Types.ObjectId;
    student: Types.ObjectId;
    service: Types.ObjectId;
    assignedCounselor?: Types.ObjectId;
    status: EnrollmentStatus;
    startedAt?: Date;
    submittedAt?: Date;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const Enrollment: import("mongoose").Model<IEnrollment, {}, {}, {}, Document<unknown, {}, IEnrollment, {}, {}> & IEnrollment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Enrollment.d.ts.map