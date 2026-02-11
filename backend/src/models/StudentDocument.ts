import mongoose, { Document, Schema } from "mongoose";

export enum DocumentCategory {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
}

export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum UploaderRole {
  STUDENT = "STUDENT",
  OPS = "OPS",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export interface IStudentDocument extends Document {
  registrationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  documentCategory: DocumentCategory;
  documentName: string;
  documentKey: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByRole: UploaderRole;
  status: DocumentStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionMessage?: string;
  version: number;
  isCustomField: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentDocumentSchema = new Schema<IStudentDocument>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "StudentServiceRegistration",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    documentCategory: {
      type: String,
      enum: Object.values(DocumentCategory),
      required: true,
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
      enum: Object.values(UploaderRole),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.PENDING,
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
    isCustomField: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
studentDocumentSchema.index({ registrationId: 1, documentKey: 1 });
studentDocumentSchema.index({ studentId: 1, status: 1 });

const StudentDocument = mongoose.model<IStudentDocument>(
  "StudentDocument",
  studentDocumentSchema
);

export default StudentDocument;

