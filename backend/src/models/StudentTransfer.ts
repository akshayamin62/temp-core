import mongoose, { Document, Schema } from "mongoose";

export enum TRANSFER_STATUS {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface IStudentTransfer extends Document {
  studentId: mongoose.Types.ObjectId;
  fromAdvisorId: mongoose.Types.ObjectId;
  toAdminId: mongoose.Types.ObjectId;
  interestedServices: string[]; // service slugs the student is interested in
  status: TRANSFER_STATUS;
  requestedBy: mongoose.Types.ObjectId; // Advisor's userId
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentTransferSchema = new Schema<IStudentTransfer>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    fromAdvisorId: {
      type: Schema.Types.ObjectId,
      ref: "Advisor",
      required: true,
    },
    toAdminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    interestedServices: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one interested service is required",
      },
    },
    status: {
      type: String,
      enum: Object.values(TRANSFER_STATUS),
      default: TRANSFER_STATUS.PENDING,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

studentTransferSchema.index({ fromAdvisorId: 1, status: 1 });
studentTransferSchema.index({ toAdminId: 1, status: 1 });
studentTransferSchema.index({ studentId: 1 });

export default mongoose.model<IStudentTransfer>("StudentTransfer", studentTransferSchema);
