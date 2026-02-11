import mongoose, { Document } from "mongoose";
import { LEAD_STAGE } from "./Lead";
export declare enum FOLLOWUP_STATUS {
    SCHEDULED = "Scheduled",
    CALL_NOT_ANSWERED = "Call Not Answered",
    PHONE_SWITCHED_OFF = "Phone Switched Off",
    OUT_OF_COVERAGE = "Out of Coverage Area",
    NUMBER_BUSY = "Number Busy",
    CALL_DISCONNECTED = "Call Disconnected",
    INVALID_NUMBER = "Invalid / Wrong Number",
    INCOMING_BARRED = "Incoming Calls Barred",
    CALL_REJECTED = "Call Rejected / Declined",
    CALL_BACK_LATER = "Asked to Call Back Later",
    BUSY_RESCHEDULE = "Busy - Requested Reschedule",
    DISCUSS_WITH_PARENTS = "Need time to discuss with parents",
    RESPONDING_VAGUELY = "Responding Vaguely / Non-committal",
    INTERESTED_NEED_TIME = "Interested - Need Time",
    INTERESTED_DISCUSSING = "Interested - Discussing with Family",
    NOT_INTERESTED = "Not Interested (Explicit)",
    NOT_REQUIRED = "Not Required Anymore",
    REPEATEDLY_NOT_RESPONDING = "Repeatedly Not Responding",
    FAKE_ENQUIRY = "Fake / Test Enquiry",
    DUPLICATE_ENQUIRY = "Duplicate Enquiry",
    CONVERTED_TO_STUDENT = "Converted to Student"
}
export declare enum MEETING_TYPE {
    ONLINE = "Online",
    FACE_TO_FACE = "Face to Face"
}
export interface IFollowUp extends Document {
    leadId: mongoose.Types.ObjectId;
    counselorId: mongoose.Types.ObjectId;
    scheduledDate: Date;
    scheduledTime: string;
    duration: number;
    meetingType: MEETING_TYPE;
    zohoMeetingKey?: string;
    zohoMeetingUrl?: string;
    status: FOLLOWUP_STATUS;
    stageAtFollowUp: LEAD_STAGE;
    stageChangedTo?: LEAD_STAGE;
    followUpNumber: number;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IFollowUp, {}, {}, {}, mongoose.Document<unknown, {}, IFollowUp, {}, {}> & IFollowUp & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FollowUp.d.ts.map