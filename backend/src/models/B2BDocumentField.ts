import mongoose, { Document, Schema } from "mongoose";

export interface IB2BDocumentField extends Document {
  b2bLeadId: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  required: boolean;
  helpText?: string;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "SUPER_ADMIN" | "B2B_OPS";
  createdAt: Date;
  updatedAt: Date;
}

const b2bDocumentFieldSchema = new Schema<IB2BDocumentField>(
  {
    b2bLeadId: {
      type: Schema.Types.ObjectId,
      ref: "B2BLead",
      required: true,
      index: true,
    },
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true },
    required: { type: Boolean, default: false },
    helpText: { type: String },
    order: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["SUPER_ADMIN", "B2B_OPS"],
      required: true,
    },
  },
  { timestamps: true }
);

b2bDocumentFieldSchema.index({ b2bLeadId: 1, documentKey: 1 }, { unique: true });

const B2BDocumentField = mongoose.model<IB2BDocumentField>(
  "B2BDocumentField",
  b2bDocumentFieldSchema
);

export default B2BDocumentField;
