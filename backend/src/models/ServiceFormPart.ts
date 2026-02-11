import mongoose, { Document, Schema } from "mongoose";

export interface IServiceFormPart extends Document {
  serviceId: mongoose.Types.ObjectId;
  partId: mongoose.Types.ObjectId;
  order: number;
  isActive: boolean;
  isRequired: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const serviceFormPartSchema = new Schema<IServiceFormPart>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    partId: {
      type: Schema.Types.ObjectId,
      ref: "FormPart",
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a part is only added once per service
serviceFormPartSchema.index({ serviceId: 1, partId: 1 }, { unique: true });

export default mongoose.model<IServiceFormPart>(
  "ServiceFormPart",
  serviceFormPartSchema
);


