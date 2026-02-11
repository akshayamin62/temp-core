import mongoose, { Document, Schema } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';

export interface IPointer6SelectedCourse extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  pointerNo: PointerNo.IntellectualCuriosity;
  courseId: mongoose.Types.ObjectId; // Reference to Pointer6Course
  startDate: Date;
  endDate: Date;
  selectedBy: mongoose.Types.ObjectId; // Student or Ivy Expert ID
  selectedAt?: Date;
  certificateFileName?: string;
  certificateFileUrl?: string;
  certificateUploadedAt?: Date;
  score?: number; // 0-10 score assigned by Ivy Expert
  scoredBy?: mongoose.Types.ObjectId; // Ivy Expert ID who scored
  scoredAt?: Date;
}

const pointer6SelectedCourseSchema = new Schema<IPointer6SelectedCourse>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  pointerNo: {
    type: Number,
    enum: [PointerNo.IntellectualCuriosity],
    required: true,
    default: PointerNo.IntellectualCuriosity,
  },
  courseId: { type: Schema.Types.ObjectId, ref: 'Pointer6Course', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  selectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  selectedAt: { type: Date, default: Date.now },
  certificateFileName: { type: String },
  certificateFileUrl: { type: String },
  certificateUploadedAt: { type: Date },
  score: { type: Number, min: 0, max: 10 },
  scoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  scoredAt: { type: Date },
});

// Index for efficient querying
pointer6SelectedCourseSchema.index({ studentIvyServiceId: 1, pointerNo: 1 });
pointer6SelectedCourseSchema.index({ courseId: 1 });

export default mongoose.model<IPointer6SelectedCourse>('Pointer6SelectedCourse', pointer6SelectedCourseSchema);
