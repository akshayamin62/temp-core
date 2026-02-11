import mongoose, { Document } from 'mongoose';
export interface IStudentSubmission extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    ivyExpertSelectedSuggestionId: mongoose.Types.ObjectId;
    files: string[];
    remarks?: string;
    submittedAt?: Date;
}
declare const _default: mongoose.Model<IStudentSubmission, {}, {}, {}, mongoose.Document<unknown, {}, IStudentSubmission, {}, {}> & IStudentSubmission & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentSubmission.d.ts.map