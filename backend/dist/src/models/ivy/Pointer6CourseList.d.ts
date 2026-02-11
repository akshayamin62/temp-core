import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IPointer6CourseList extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.IntellectualCuriosity;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt?: Date;
}
declare const _default: mongoose.Model<IPointer6CourseList, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6CourseList, {}, {}> & IPointer6CourseList & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6CourseList.d.ts.map