import mongoose, { Document, Schema } from "mongoose";

export enum SPDocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface ISPDocument extends Document {
  serviceProviderId: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByRole: string;
  status: SPDocumentStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionMessage?: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const spDocumentSchema = new Schema<ISPDocument>(
  {
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    documentKey: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedByRole: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SPDocumentStatus),
      default: SPDocumentStatus.PENDING,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionMessage: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
spDocumentSchema.index({ serviceProviderId: 1, documentKey: 1 });
spDocumentSchema.index({ serviceProviderId: 1, status: 1 });

const ServiceProviderDocument = mongoose.model<ISPDocument>(
  "ServiceProviderDocument",
  spDocumentSchema
);

export default ServiceProviderDocument;
