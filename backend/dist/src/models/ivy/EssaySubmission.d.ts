import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IEssaySubmission extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo.AuthenticStorytelling;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    submittedBy: mongoose.Types.ObjectId;
    submittedAt?: Date;
}
declare const _default: mongoose.Model<IEssaySubmission, {}, {}, {}, mongoose.Document<unknown, {}, IEssaySubmission, {}, {}> & IEssaySubmission & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=EssaySubmission.d.ts.map