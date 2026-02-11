import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
import { DocumentType } from '../../types/DocumentType';

export interface IIvyExpertDocument extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo;
  documentType: DocumentType;
  fileUrl: string;
  uploadedAt?: Date;
}

const ivyExpertDocumentSchema = new Schema<IIvyExpertDocument>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: { type: Number, enum: [PointerNo.AuthenticStorytelling, PointerNo.IntellectualCuriosity], required: true },
  documentType: { type: String, enum: Object.values(DocumentType), required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IIvyExpertDocument>('IvyExpertDocument', ivyExpertDocumentSchema);
