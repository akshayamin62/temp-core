import mongoose, { Schema, Document } from 'mongoose';

export interface ISPEnquiry extends Document {
  studentId: mongoose.Types.ObjectId;
  serviceProviderId: mongoose.Types.ObjectId;
  spServiceId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  studentMobile?: string;
  message: string;
  status: 'New' | 'Contacted' | 'Closed' | 'Converted';
  createdAt: Date;
  updatedAt: Date;
}

const SPEnquirySchema = new Schema<ISPEnquiry>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
      index: true,
    },
    spServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'SPService',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    studentMobile: {
      type: String,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Closed', 'Converted'],
      default: 'New',
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISPEnquiry>('SPEnquiry', SPEnquirySchema);
