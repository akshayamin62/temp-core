import mongoose, { Document, Schema } from 'mongoose';

export interface IPointer6CertificateEvaluation extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  certificateId: mongoose.Types.ObjectId;
  score: number; // 0–10
  feedback?: string;
  evaluatedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  evaluatedAt: Date;
}

const pointer6CertificateEvaluationSchema = new Schema<IPointer6CertificateEvaluation>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  certificateId: { type: Schema.Types.ObjectId, ref: 'Pointer6Certificate', required: true, unique: true },
  score: { type: Number, required: true, min: 0, max: 10 },
  feedback: { type: String },
  evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evaluatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPointer6CertificateEvaluation>('Pointer6CertificateEvaluation', pointer6CertificateEvaluationSchema);
