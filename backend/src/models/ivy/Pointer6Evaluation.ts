import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IPointer6Evaluation extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.IntellectualCuriosity;
  score: number; // 0–10
  feedback?: string;
  evaluatedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  evaluatedAt?: Date;
}

const pointer6EvaluationSchema = new Schema<IPointer6Evaluation>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true, unique: true },
  pointerNo: {
    type: Number,
    enum: [PointerNo.IntellectualCuriosity],
    required: true,
    default: PointerNo.IntellectualCuriosity,
  },
  score: { type: Number, required: true, min: 0, max: 10 },
  feedback: { type: String },
  evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evaluatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPointer6Evaluation>('Pointer6Evaluation', pointer6EvaluationSchema);


