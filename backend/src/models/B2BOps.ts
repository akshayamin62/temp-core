import mongoose, { Document, Schema } from "mongoose";

export interface IB2BOps extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const b2bOpsSchema = new Schema<IB2BOps>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IB2BOps>("B2BOps", b2bOpsSchema);
