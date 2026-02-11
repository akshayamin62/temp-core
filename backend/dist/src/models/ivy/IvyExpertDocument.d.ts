import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
import { DocumentType } from '../../types/DocumentType';
export interface IIvyExpertDocument extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    pointerNo: PointerNo;
    documentType: DocumentType;
    fileUrl: string;
    uploadedAt?: Date;
}
declare const _default: mongoose.Model<IIvyExpertDocument, {}, {}, {}, mongoose.Document<unknown, {}, IIvyExpertDocument, {}, {}> & IIvyExpertDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=IvyExpertDocument.d.ts.map