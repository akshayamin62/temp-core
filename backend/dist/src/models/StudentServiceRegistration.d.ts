import mongoose, { Document } from "mongoose";
export declare enum ServiceRegistrationStatus {
    REGISTERED = "REGISTERED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export interface IStudentServiceRegistration extends Document {
    studentId: mongoose.Types.ObjectId;
    serviceId: mongoose.Types.ObjectId;
    primaryOpsId?: mongoose.Types.ObjectId;
    secondaryOpsId?: mongoose.Types.ObjectId;
    activeOpsId?: mongoose.Types.ObjectId;
    primaryIvyExpertId?: mongoose.Types.ObjectId;
    secondaryIvyExpertId?: mongoose.Types.ObjectId;
    activeIvyExpertId?: mongoose.Types.ObjectId;
    primaryEduplanCoachId?: mongoose.Types.ObjectId;
    secondaryEduplanCoachId?: mongoose.Types.ObjectId;
    activeEduplanCoachId?: mongoose.Types.ObjectId;
    overallScore?: number;
    studentInterest?: string;
    status: ServiceRegistrationStatus;
    registeredAt: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    paymentStatus?: string;
    paymentAmount?: number;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IStudentServiceRegistration, {}, {}, {}, mongoose.Document<unknown, {}, IStudentServiceRegistration, {}, {}> & IStudentServiceRegistration & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentServiceRegistration.d.ts.map