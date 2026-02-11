import mongoose, { Document } from 'mongoose';
import { AcademicDocumentType } from '../../types/AcademicDocumentType';
export interface IAcademicDocument extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    documentType: AcademicDocumentType;
    customLabel?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
}
declare const _default: mongoose.Model<IAcademicDocument, {}, {}, {}, mongoose.Document<unknown, {}, IAcademicDocument, {}, {}> & IAcademicDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AcademicDocument.d.ts.map