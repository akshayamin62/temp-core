import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IPointer6SelectedCourse extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.IntellectualCuriosity;
    courseId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    selectedBy: mongoose.Types.ObjectId;
    selectedAt?: Date;
    certificateFileName?: string;
    certificateFileUrl?: string;
    certificateUploadedAt?: Date;
    score?: number;
    scoredBy?: mongoose.Types.ObjectId;
    scoredAt?: Date;
}
declare const _default: mongoose.Model<IPointer6SelectedCourse, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6SelectedCourse, {}, {}> & IPointer6SelectedCourse & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6SelectedCourse.d.ts.map