import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IEssaySubmission extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.AuthenticStorytelling;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  submittedBy: mongoose.Types.ObjectId; // Student ID
  submittedAt?: Date;
}

const essaySubmissionSchema = new Schema<IEssaySubmission>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: { type: Number, enum: [PointerNo.AuthenticStorytelling], required: true, default: PointerNo.AuthenticStorytelling },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
});

// One essay per student per pointer per service
essaySubmissionSchema.index({ studentIvyServiceId: 1, pointerNo: 1 }, { unique: true });

export default mongoose.model<IEssaySubmission>('EssaySubmission', essaySubmissionSchema);

