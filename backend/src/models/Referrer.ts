import mongoose, { Document, Schema } from "mongoose";

export interface IReferrer extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  referralSlug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const referrerSchema = new Schema<IReferrer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/.test(v);
        },
        message: "Invalid phone number format",
      },
    },
    referralSlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

referrerSchema.index({ adminId: 1 });

export default mongoose.model<IReferrer>("Referrer", referrerSchema);
