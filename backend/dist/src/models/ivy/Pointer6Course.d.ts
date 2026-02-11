import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IPointer6Course extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.IntellectualCuriosity;
    srNo: number;
    platform: string;
    courseName: string;
    duration: string;
    fees: string;
    link: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt?: Date;
}
declare const _default: mongoose.Model<IPointer6Course, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6Course, {}, {}> & IPointer6Course & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6Course.d.ts.map