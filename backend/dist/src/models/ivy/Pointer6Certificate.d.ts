import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IPointer6Certificate extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.IntellectualCuriosity;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt?: Date;
}
declare const _default: mongoose.Model<IPointer6Certificate, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6Certificate, {}, {}> & IPointer6Certificate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6Certificate.d.ts.map