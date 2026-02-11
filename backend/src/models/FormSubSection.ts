import mongoose, { Document, Schema } from "mongoose";

export interface IFormSubSection extends Document {
  sectionId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  isRepeatable: boolean;
  isActive: boolean;
  maxRepeat?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const formSubSectionSchema = new Schema<IFormSubSection>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "FormSection",
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
    isRepeatable: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxRepeat: {
      type: Number,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
formSubSectionSchema.index({ sectionId: 1, order: 1 });

export default mongoose.model<IFormSubSection>(
  "FormSubSection",
  formSubSectionSchema
);


