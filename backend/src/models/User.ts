import mongoose, { Document, Schema } from "mongoose";
import { USER_ROLE } from "../types/roles";

export interface IUser extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: USER_ROLE;
  isVerified: boolean;
  isActive: boolean;
  otp?: string;
  otpExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, required: false },
    lastName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      default: undefined,
    },
    otpExpires: {
      type: Date,
      default: undefined,
    },
  },
  { 
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", userSchema);

