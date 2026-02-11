import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  counselorId?: mongoose.Types.ObjectId;
  email?: string;
  mobileNumber?: string;
  convertedFromLeadId?: mongoose.Types.ObjectId;
  conversionDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    counselorId: {
      type: Schema.Types.ObjectId,
      ref: "Counselor",
      required: false,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    convertedFromLeadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
    },
    conversionDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

// Database indexes for performance
// Note: userId already has unique index from schema definition
studentSchema.index({ email: 1 });
studentSchema.index({ adminId: 1 });
studentSchema.index({ counselorId: 1 });

export default mongoose.model<IStudent>("Student", studentSchema);


