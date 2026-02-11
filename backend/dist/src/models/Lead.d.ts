import mongoose, { Document } from "mongoose";
export declare enum SERVICE_TYPE {
    EDUCATION_PLANNING = "Education Planning",
    CARRER_FOCUS_STUDY_ABROAD = "Carrer Focus Study Abroad ",
    IVY_LEAGUE_ADMISSION = "Ivy League Admission",
    IELTS_GRE_LANGUAGE_COACHING = "IELTS/GRE/Language Coaching"
}
export declare enum LEAD_STAGE {
    NEW = "New",
    HOT = "Hot",
    WARM = "Warm",
    COLD = "Cold",
    CONVERTED = "Converted to Student",
    CLOSED = "Closed"
}
export interface ILead extends Document {
    name: string;
    email: string;
    mobileNumber: string;
    city?: string;
    serviceTypes: SERVICE_TYPE[];
    adminId: mongoose.Types.ObjectId;
    assignedCounselorId?: mongoose.Types.ObjectId;
    stage: LEAD_STAGE;
    source: string;
    conversionRequestId?: mongoose.Types.ObjectId;
    conversionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<ILead, {}, {}, {}, mongoose.Document<unknown, {}, ILead, {}, {}> & ILead & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Lead.d.ts.map