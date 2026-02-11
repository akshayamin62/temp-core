import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IIvyPointer extends Document {
    pointerNo: PointerNo;
    title: string;
    description: string;
    maxScore: number;
}
declare const _default: mongoose.Model<IIvyPointer, {}, {}, {}, mongoose.Document<unknown, {}, IIvyPointer, {}, {}> & IIvyPointer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=IvyPointer.d.ts.map