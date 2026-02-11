import mongoose, { Document, Schema } from "mongoose";

export interface IFormSection extends Document {
  partId: mongoose.Types.ObjectId;  // Only linked to Part, not Service
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  isRepeatable?: boolean;
  minRepeats?: number;
  maxRepeats?: number;
  questions?: any[];
  isGlobal?: boolean;
  usedInServices?: any[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const formSectionSchema = new Schema<IFormSection>(
  {
    partId: {
      type: Schema.Types.ObjectId,
      ref: "FormPart",
      required: true,
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

// Index for efficient querying
formSectionSchema.index({ partId: 1, order: 1 });

export default mongoose.model<IFormSection>("FormSection", formSectionSchema);


