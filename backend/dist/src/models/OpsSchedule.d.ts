import mongoose, { Document } from "mongoose";
export declare enum OPS_SCHEDULE_STATUS {
    SCHEDULED = "SCHEDULED",
    COMPLETED = "COMPLETED",
    MISSED = "MISSED"
}
export interface IOpsSchedule extends Document {
    opsId: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
    scheduledDate: Date;
    scheduledTime: string;
    description: string;
    status: OPS_SCHEDULE_STATUS;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IOpsSchedule, {}, {}, {}, mongoose.Document<unknown, {}, IOpsSchedule, {}, {}> & IOpsSchedule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=OpsSchedule.d.ts.map