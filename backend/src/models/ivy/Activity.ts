import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  name: string;
  pointerNo: 2 | 3 | 4;
  documentUrl: string;
  documentName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pointerNo: {
      type: Number,
      required: true,
      enum: [2, 3, 4],
    },
    documentUrl: {
      type: String,
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IActivity>('Activity', ActivitySchema);
