import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IEssayGuideline extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.AuthenticStorytelling;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt?: Date;
}
declare const _default: mongoose.Model<IEssayGuideline, {}, {}, {}, mongoose.Document<unknown, {}, IEssayGuideline, {}, {}> & IEssayGuideline & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=EssayGuideline.d.ts.map