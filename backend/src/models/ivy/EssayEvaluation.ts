import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IEssayEvaluation extends Document {
  essaySubmissionId: mongoose.Types.ObjectId;
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.AuthenticStorytelling;
  score: number; // 0-10
  feedback?: string;
  evaluatedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  evaluatedAt?: Date;
}

const essayEvaluationSchema = new Schema<IEssayEvaluation>({
  essaySubmissionId: { type: Schema.Types.ObjectId, ref: 'EssaySubmission', required: true, unique: true },
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: { type: Number, enum: [PointerNo.AuthenticStorytelling], required: true, default: PointerNo.AuthenticStorytelling },
  score: { type: Number, required: true, min: 0, max: 10 },
  feedback: { type: String },
  evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evaluatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IEssayEvaluation>('EssayEvaluation', essayEvaluationSchema);

