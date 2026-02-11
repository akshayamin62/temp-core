import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
interface PointerScore {
    pointerNo: PointerNo;
    score: number;
    maxScore: number;
}
export interface IStudentIvyScoreCard extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerScores: PointerScore[];
    overallScore: number;
    generatedAt?: Date;
}
declare const _default: mongoose.Model<IStudentIvyScoreCard, {}, {}, {}, mongoose.Document<unknown, {}, IStudentIvyScoreCard, {}, {}> & IStudentIvyScoreCard & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentIvyScoreCard.d.ts.map