import mongoose, { Document, Schema } from "mongoose";

// Common form parts - can be extended by adding new entries
export enum FormPartKey {
  PROFILE = "PROFILE",
  APPLICATION = "APPLICATION",
  DOCUMENT = "DOCUMENT",
  PAYMENT = "PAYMENT",
  // Future parts can be added here:
  // TESTS = "TESTS",
  // RECOMMENDATIONS = "RECOMMENDATIONS",
  // PORTFOLIO = "PORTFOLIO",
}

export interface IFormPart extends Document {
  key: string;  // Changed from FormPartKey to string for flexibility
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const formPartSchema = new Schema<IFormPart>(
  {
    key: {
      type: String,
      // Removed enum validation to allow dynamic parts
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: undefined,
    },
    order: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IFormPart>("FormPart", formPartSchema);


