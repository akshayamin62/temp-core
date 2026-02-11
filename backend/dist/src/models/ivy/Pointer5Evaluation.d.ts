import mongoose, { Document } from 'mongoose';
export interface IPointer5Evaluation extends Document {
    submissionId: mongoose.Types.ObjectId;
    taskId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    ivyExpertId: mongoose.Types.ObjectId;
    score: number;
    feedback: string;
    evaluatedAt: Date;
}
declare const Pointer5EvaluationModel: mongoose.Model<IPointer5Evaluation, {}, {}, {}, mongoose.Document<unknown, {}, IPointer5Evaluation, {}, {}> & IPointer5Evaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Pointer5EvaluationModel;
//# sourceMappingURL=Pointer5Evaluation.d.ts.map