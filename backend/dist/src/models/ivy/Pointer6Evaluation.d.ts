import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IPointer6Evaluation extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.IntellectualCuriosity;
    score: number;
    feedback?: string;
    evaluatedBy: mongoose.Types.ObjectId;
    evaluatedAt?: Date;
}
declare const _default: mongoose.Model<IPointer6Evaluation, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6Evaluation, {}, {}> & IPointer6Evaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6Evaluation.d.ts.map