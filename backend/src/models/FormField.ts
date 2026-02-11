import mongoose, { Document, Schema } from "mongoose";

export enum FieldType {
  TEXT = "TEXT",
  EMAIL = "EMAIL",
  NUMBER = "NUMBER",
  DATE = "DATE",
  PHONE = "PHONE",
  TEXTAREA = "TEXTAREA",
  SELECT = "SELECT",
  RADIO = "RADIO",
  CHECKBOX = "CHECKBOX",
  FILE = "FILE",
  COUNTRY = "COUNTRY",
  STATE = "STATE",
  CITY = "CITY",
}

export interface IFormField extends Document {
  subSectionId: mongoose.Types.ObjectId;
  label: string;
  key: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  isActive: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{
    label: string;
    value: string;
  }>;
  defaultValue?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const formFieldSchema = new Schema<IFormField>(
  {
    subSectionId: {
      type: Schema.Types.ObjectId,
      ref: "FormSubSection",
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(FieldType),
      required: true,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    helpText: {
      type: String,
      default: undefined,
    },
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validation: {
      type: {
        min: Number,
        max: Number,
        pattern: String,
        message: String,
      },
      default: undefined,
    },
    options: {
      type: [
        {
          label: String,
          value: String,
        },
      ],
      default: undefined,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
formFieldSchema.index({ subSectionId: 1, order: 1 });

export default mongoose.model<IFormField>("FormField", formFieldSchema);


