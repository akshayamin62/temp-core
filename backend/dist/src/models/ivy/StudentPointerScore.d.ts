import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IStudentPointerScore extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo;
    scoreObtained: number;
    maxScore: number;
    lastUpdated?: Date;
}
declare const _default: mongoose.Model<IStudentPointerScore, {}, {}, {}, mongoose.Document<unknown, {}, IStudentPointerScore, {}, {}> & IStudentPointerScore & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentPointerScore.d.ts.map