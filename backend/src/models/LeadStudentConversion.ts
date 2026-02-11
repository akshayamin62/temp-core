import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CONVERSION_STATUS {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ILeadStudentConversion extends Document {
  leadId: Types.ObjectId;
  requestedBy: Types.ObjectId; // Counselor who requested
  adminId: Types.ObjectId; // Admin who will approve/reject
  status: CONVERSION_STATUS;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  createdStudentId?: Types.ObjectId; // Reference to created student after approval
  createdAt: Date;
  updatedAt: Date;
}

const LeadStudentConversionSchema = new Schema<ILeadStudentConversion>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(CONVERSION_STATUS),
      default: CONVERSION_STATUS.PENDING
    },
    rejectionReason: {
      type: String
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: {
      type: Date
    },
    createdStudentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student'
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
LeadStudentConversionSchema.index({ adminId: 1, status: 1 });
LeadStudentConversionSchema.index({ leadId: 1 });
LeadStudentConversionSchema.index({ requestedBy: 1 });

export default mongoose.model<ILeadStudentConversion>('LeadStudentConversion', LeadStudentConversionSchema);
