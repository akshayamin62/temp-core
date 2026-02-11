import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IIvyExpertEvaluation extends Document {
    studentSubmissionId: mongoose.Types.ObjectId;
    pointerNo: PointerNo;
    score: number;
    feedback?: string;
    evaluatedAt?: Date;
}
declare const _default: mongoose.Model<IIvyExpertEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IIvyExpertEvaluation, {}, {}> & IIvyExpertEvaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=IvyExpertEvaluation.d.ts.map