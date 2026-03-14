import mongoose, { Document, Schema } from "mongoose";

export interface IParent extends Document {
  userId: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  email: string;
  relationship: string;
  mobileNumber: string;
  qualification: string;
  occupation: string;
  convertedFromLeadId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const parentSchema = new Schema<IParent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    studentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    email: {
      type: String,
      trim: true,
      default: "",
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },
    occupation: {
      type: String,
      trim: true,
      default: "",
    },
    convertedFromLeadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
  },
  { timestamps: true }
);

parentSchema.index({ userId: 1 });
parentSchema.index({ studentIds: 1 });

export default mongoose.model<IParent>("Parent", parentSchema);
