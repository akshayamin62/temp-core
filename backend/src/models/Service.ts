import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon?: string;
  learnMoreUrl?: string;
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: undefined,
    },
    learnMoreUrl: {
      type: String,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IService>("Service", serviceSchema);


