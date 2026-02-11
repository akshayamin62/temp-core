import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IPointer6Certificate extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.IntellectualCuriosity;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId; // Student ID
  uploadedAt?: Date;
}

const pointer6CertificateSchema = new Schema<IPointer6Certificate>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: {
    type: Number,
    enum: [PointerNo.IntellectualCuriosity],
    required: true,
    default: PointerNo.IntellectualCuriosity,
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPointer6Certificate>('Pointer6Certificate', pointer6CertificateSchema);


