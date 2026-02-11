import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IEssayGuideline extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.AuthenticStorytelling;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  uploadedAt?: Date;
}

const essayGuidelineSchema = new Schema<IEssayGuideline>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: { type: Number, enum: [PointerNo.AuthenticStorytelling], required: true, default: PointerNo.AuthenticStorytelling },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

// One guideline per student per pointer
essayGuidelineSchema.index({ studentIvyServiceId: 1, pointerNo: 1 }, { unique: true });

export default mongoose.model<IEssayGuideline>('EssayGuideline', essayGuidelineSchema);

