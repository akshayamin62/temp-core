import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IPointer6Course extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.IntellectualCuriosity;
  srNo: number;
  platform: string;
  courseName: string;
  duration: string;
  fees: string;
  link: string;
  uploadedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  uploadedAt?: Date;
}

const pointer6CourseSchema = new Schema<IPointer6Course>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: {
    type: Number,
    enum: [PointerNo.IntellectualCuriosity],
    required: true,
    default: PointerNo.IntellectualCuriosity,
  },
  srNo: { type: Number, required: true },
  platform: { type: String, required: true },
  courseName: { type: String, required: true },
  duration: { type: String, required: true },
  fees: { type: String, required: true },
  link: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

// Index for efficient querying
pointer6CourseSchema.index({ studentIvyServiceId: 1, pointerNo: 1 });

export default mongoose.model<IPointer6Course>('Pointer6Course', pointer6CourseSchema);
