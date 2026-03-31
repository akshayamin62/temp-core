import mongoose, { Document, Schema } from 'mongoose';

export interface ICoachingBatch extends Document {
  planKey: string; // e.g. IELTS, GRE, FRENCH_A1 etc.
  batchDate: Date;
  timeFrom: string; // e.g. "10:00 PM"
  timeTo: string;   // e.g. "11:30 PM"
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const coachingBatchSchema = new Schema<ICoachingBatch>(
  {
    planKey: {
      type: String,
      required: true,
      index: true,
    },
    batchDate: {
      type: Date,
      required: true,
    },
    timeFrom: {
      type: String,
      required: true,
    },
    timeTo: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

coachingBatchSchema.index({ planKey: 1, batchDate: 1 });

export default mongoose.model<ICoachingBatch>('CoachingBatch', coachingBatchSchema);
