import mongoose, { Document, Schema } from "mongoose";

export interface IB2BSales extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const b2bSalesSchema = new Schema<IB2BSales>(
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

export default mongoose.model<IB2BSales>("B2BSales", b2bSalesSchema);
