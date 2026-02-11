import mongoose, { Document } from "mongoose";
export declare enum TEAMMEET_STATUS {
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION",
    CONFIRMED = "CONFIRMED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED"
}
export declare enum TEAMMEET_TYPE {
    ONLINE = "ONLINE",
    FACE_TO_FACE = "FACE_TO_FACE"
}
export interface ITeamMeet extends Document {
    subject: string;
    scheduledDate: Date;
    scheduledTime: string;
    duration: number;
    meetingType: TEAMMEET_TYPE;
    zohoMeetingKey?: string;
    zohoMeetingUrl?: string;
    description?: string;
    requestedBy: mongoose.Types.ObjectId;
    requestedTo: mongoose.Types.ObjectId;
    adminId: mongoose.Types.ObjectId;
    status: TEAMMEET_STATUS;
    rejectionMessage?: string;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<ITeamMeet, {}, {}, {}, mongoose.Document<unknown, {}, ITeamMeet, {}, {}> & ITeamMeet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TeamMeet.d.ts.map