import mongoose, { Document, Schema } from "mongoose";

export interface IB2BDocumentField extends Document {
  b2bLeadId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  advisorId?: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  section?: string;
  required: boolean;
  helpText?: string;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "SUPER_ADMIN" | "B2B_OPS" | "ADMIN" | "ADVISOR" | "SYSTEM";
  createdAt: Date;
  updatedAt: Date;
}

const b2bDocumentFieldSchema = new Schema<IB2BDocumentField>(
  {
    b2bLeadId: {
      type: Schema.Types.ObjectId,
      ref: "B2BLead",
      required: false,
      index: true,
      default: null,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
      index: true,
      default: null,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "Advisor",
      required: false,
      index: true,
      default: null,
    },
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true },
    section: { type: String },
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
      enum: ["SUPER_ADMIN", "B2B_OPS", "ADMIN", "ADVISOR", "SYSTEM"],
      required: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for performance (not unique — allow multiple sources)
b2bDocumentFieldSchema.index({ b2bLeadId: 1, isActive: 1 });
b2bDocumentFieldSchema.index({ adminId: 1, isActive: 1 });
b2bDocumentFieldSchema.index({ advisorId: 1, isActive: 1 });

const B2BDocumentField = mongoose.model<IB2BDocumentField>(
  "B2BDocumentField",
  b2bDocumentFieldSchema
);

export default B2BDocumentField;

