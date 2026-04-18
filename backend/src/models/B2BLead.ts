import mongoose, { Document, Schema } from "mongoose";

export enum B2B_LEAD_TYPE {
  FRANCHISE = "Franchise",
  INSTITUTION = "Institution",
  ADVISOR = "Advisor",
}

export enum B2B_LEAD_STAGE {
  NEW = "New",
  HOT = "Hot",
  WARM = "Warm",
  COLD = "Cold",
  IN_PROCESS = "Proceed for Documentation",
  CONVERTED = "Converted",
  CLOSED = "Closed",
}

export interface IB2BLead extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  type: B2B_LEAD_TYPE;
  stage: B2B_LEAD_STAGE;
  source: string;
  assignedB2BSalesId?: mongoose.Types.ObjectId;
  assignedB2BOpsId?: mongoose.Types.ObjectId;
  conversionRequestId?: mongoose.Types.ObjectId;
  conversionStatus?: "PENDING" | "APPROVED" | "REJECTED" | "DOCUMENT_VERIFICATION";
  createdAt?: Date;
  updatedAt?: Date;
}

const b2bLeadSchema = new Schema<IB2BLead>(
  {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(B2B_LEAD_TYPE),
      required: true,
    },
    stage: {
      type: String,
      enum: Object.values(B2B_LEAD_STAGE),
      default: B2B_LEAD_STAGE.NEW,
    },
    source: { type: String, default: "B2B Enquiry Form" },
    assignedB2BSalesId: {
      type: Schema.Types.ObjectId,
      ref: "B2BSales",
      default: null,
    },
    assignedB2BOpsId: {
      type: Schema.Types.ObjectId,
      ref: "B2BOps",
      default: null,
    },
    conversionRequestId: {
      type: Schema.Types.ObjectId,
      ref: "B2BConversion",
      default: null,
    },
    conversionStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "DOCUMENT_VERIFICATION"],
      default: null,
    },
  },
  { timestamps: true }
);

b2bLeadSchema.index({ stage: 1 });
b2bLeadSchema.index({ assignedB2BSalesId: 1, stage: 1 });
b2bLeadSchema.index({ assignedB2BOpsId: 1, stage: 1 });
b2bLeadSchema.index({ email: 1 });

export default mongoose.model<IB2BLead>("B2BLead", b2bLeadSchema);
