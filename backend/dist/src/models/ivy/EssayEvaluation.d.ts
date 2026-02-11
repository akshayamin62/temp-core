import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IEssayEvaluation extends Document {
    essaySubmissionId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.AuthenticStorytelling;
    score: number;
    feedback?: string;
    evaluatedBy: mongoose.Types.ObjectId;
    evaluatedAt?: Date;
}
declare const _default: mongoose.Model<IEssayEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IEssayEvaluation, {}, {}> & IEssayEvaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=EssayEvaluation.d.ts.map