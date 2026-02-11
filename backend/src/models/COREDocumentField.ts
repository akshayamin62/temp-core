import mongoose, { Document, Schema } from "mongoose";

// Document type enum for differentiating between CORE and EXTRA documents
export enum COREDocumentType {
  CORE = "CORE",
  EXTRA = "EXTRA",
}

// Model for student-specific CORE Document fields
export interface ICOREDocumentField extends Document {
  studentId: mongoose.Types.ObjectId;
  registrationId: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  documentType: COREDocumentType;
  category: "PRIMARY" | "SECONDARY";
  required: boolean;
  helpText?: string;
  allowMultiple: boolean;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "SUPER_ADMIN" | "OPS";
  createdAt: Date;
  updatedAt: Date;
}

const coreDocumentFieldSchema = new Schema<ICOREDocumentField>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "StudentServiceRegistration",
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
    documentType: {
      type: String,
      enum: Object.values(COREDocumentType),
      required: true,
      default: COREDocumentType.CORE,
      index: true,
    },
    category: {
      type: String,
      enum: ["PRIMARY", "SECONDARY"],
      default: "SECONDARY",
    },
    required: {
      type: Boolean,
      default: false,
    },
    helpText: {
      type: String,
    },
    allowMultiple: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["SUPER_ADMIN", "OPS"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for student + registration + documentKey + documentType uniqueness
coreDocumentFieldSchema.index(
  { studentId: 1, registrationId: 1, documentKey: 1, documentType: 1 },
  { unique: true }
);

export default mongoose.model<ICOREDocumentField>(
  "COREDocumentField",
  coreDocumentFieldSchema
);

