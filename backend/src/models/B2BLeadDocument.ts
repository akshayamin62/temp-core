import mongoose, { Document, Schema } from "mongoose";

export enum B2BDocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface IB2BLeadDocument extends Document {
  b2bLeadId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  advisorId?: mongoose.Types.ObjectId;
  documentFieldId?: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByRole: string;
  status: B2BDocumentStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionMessage?: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const b2bLeadDocumentSchema = new Schema<IB2BLeadDocument>(
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
    documentFieldId: {
      type: Schema.Types.ObjectId,
      ref: "B2BDocumentField",
      required: false,
      default: null,
    },
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedByRole: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(B2BDocumentStatus),
      default: B2BDocumentStatus.PENDING,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionMessage: { type: String },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

b2bLeadDocumentSchema.index({ b2bLeadId: 1, documentKey: 1 });
b2bLeadDocumentSchema.index({ adminId: 1, documentKey: 1 });
b2bLeadDocumentSchema.index({ advisorId: 1, documentKey: 1 });
b2bLeadDocumentSchema.index({ b2bLeadId: 1, status: 1 });
b2bLeadDocumentSchema.index({ adminId: 1, status: 1 });
b2bLeadDocumentSchema.index({ advisorId: 1, status: 1 });

const B2BLeadDocument = mongoose.model<IB2BLeadDocument>(
  "B2BLeadDocument",
  b2bLeadDocumentSchema
);

export default B2BLeadDocument;
