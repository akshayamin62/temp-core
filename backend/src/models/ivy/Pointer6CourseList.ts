import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IPointer6CourseList extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.IntellectualCuriosity;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId; // Ivy Expert ID
  uploadedAt?: Date;
}

const pointer6CourseListSchema = new Schema<IPointer6CourseList>({
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

// One course list per student ivy service for pointer 6
pointer6CourseListSchema.index({ studentIvyServiceId: 1, pointerNo: 1 }, { unique: true });

export default mongoose.model<IPointer6CourseList>('Pointer6CourseList', pointer6CourseListSchema);


