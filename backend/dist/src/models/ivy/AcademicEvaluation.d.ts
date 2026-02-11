import mongoose, { Document } from 'mongoose';
export interface IAcademicEvaluation extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    academicDocumentId: mongoose.Types.ObjectId;
    score: number;
    feedback?: string;
    evaluatedBy: mongoose.Types.ObjectId;
    evaluatedAt: Date;
}
declare const _default: mongoose.Model<IAcademicEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IAcademicEvaluation, {}, {}> & IAcademicEvaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AcademicEvaluation.d.ts.map