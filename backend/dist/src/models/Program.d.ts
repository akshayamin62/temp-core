import mongoose, { Document } from "mongoose";
export interface IProgram extends Document {
    createdBy: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
    university: string;
    universityRanking: {
        webometricsWorld?: number;
        webometricsNational?: number;
        usNews?: number;
        qs?: number;
    };
    programName: string;
    programUrl: string;
    campus: string;
    country: string;
    studyLevel: string;
    duration: number;
    ieltsScore: number;
    applicationFee: number;
    yearlyTuitionFees: number;
    priority?: number;
    intake?: string;
    year?: string;
    selectedAt?: Date;
    isSelectedByStudent: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IProgram, {}, {}, {}, mongoose.Document<unknown, {}, IProgram, {}, {}> & IProgram & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Program.d.ts.map