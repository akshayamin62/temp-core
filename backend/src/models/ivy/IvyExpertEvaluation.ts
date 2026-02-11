import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IIvyExpertEvaluation extends Document {
  studentSubmissionId: mongoose.Types.ObjectId;
  pointerNo: PointerNo;
  score: number;
  feedback?: string;
  evaluatedAt?: Date;
}

const ivyExpertEvaluationSchema = new Schema<IIvyExpertEvaluation>({
  studentSubmissionId: { type: Schema.Types.ObjectId, ref: 'StudentSubmission', required: true },
  pointerNo: { type: Number, enum: Object.values(PointerNo).filter(v => typeof v === 'number') as number[], required: true },
  score: { type: Number, required: true },
  feedback: { type: String },
  evaluatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IIvyExpertEvaluation>('IvyExpertEvaluation', ivyExpertEvaluationSchema);
