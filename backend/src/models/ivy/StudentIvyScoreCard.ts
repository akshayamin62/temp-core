import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

interface PointerScore {
  pointerNo: PointerNo;
  score: number;
  maxScore: number;
}

export interface IStudentIvyScoreCard extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerScores: PointerScore[];
  overallScore: number;
  generatedAt?: Date;
}

const pointerScoreSchema = new Schema<PointerScore>({
  pointerNo: {
    type: Number,
    enum: Object.values(PointerNo).filter(v => typeof v === 'number') as number[],
    required: true,
  },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
}, { _id: false });

const studentIvyScoreCardSchema = new Schema<IStudentIvyScoreCard>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true, unique: true },
  pointerScores: { type: [pointerScoreSchema], required: true },
  overallScore: { type: Number, required: true },
  generatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IStudentIvyScoreCard>('StudentIvyScoreCard', studentIvyScoreCardSchema);

