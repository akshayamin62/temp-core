import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IStudentPointerScore extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo;
  scoreObtained: number;
  maxScore: number;
  lastUpdated?: Date;
}

const studentPointerScoreSchema = new Schema<IStudentPointerScore>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: { type: Number, enum: Object.values(PointerNo).filter(v => typeof v === 'number') as number[], required: true },
  scoreObtained: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model<IStudentPointerScore>('StudentPointerScore', studentPointerScoreSchema);

