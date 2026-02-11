import mongoose, { Document, Schema } from "mongoose";

export interface ICounselor extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  adminId: mongoose.Types.ObjectId; // Reference to Admin who created this counselor
  email: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const counselorSchema = new Schema<ICounselor>(
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
        validator: function(v: string) {
          if (!v) return true; // Allow empty if not required
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICounselor>("Counselor", counselorSchema);


