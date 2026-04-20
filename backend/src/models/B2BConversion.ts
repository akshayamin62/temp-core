import mongoose, { Schema, Document, Types } from "mongoose";

export enum B2B_CONVERSION_STEP {
  TO_IN_PROCESS = "TO_IN_PROCESS",
  TO_ADMIN_ADVISOR = "TO_ADMIN_ADVISOR",
}

export enum B2B_CONVERSION_STATUS {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface IB2BConversion extends Document {
  b2bLeadId: Types.ObjectId;
  step: B2B_CONVERSION_STEP;
  requestedBy: Types.ObjectId;
  targetRole: "Admin" | "Advisor";
  status: B2B_CONVERSION_STATUS;
  loginEmail?: string; // Email for Admin/Advisor account creation (provided by B2B Sales)
  mobileNumber?: string; // Mobile number for Admin/Advisor (editable by B2B Sales)
  // Company details filled by B2B OPS during step 2
  companyName?: string;
  companyAddress?: string;
  enquiryFormSlug?: string;
  allowedServices?: string[];
  aadharDocUrl?: string;
  panDocUrl?: string;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  createdAdminId?: Types.ObjectId;
  createdAdvisorId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const b2bConversionSchema = new Schema<IB2BConversion>(
  {
    b2bLeadId: {
      type: Schema.Types.ObjectId,
      ref: "B2BLead",
      required: true,
    },
    step: {
      type: String,
      enum: Object.values(B2B_CONVERSION_STEP),
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["Admin", "Advisor"],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(B2B_CONVERSION_STATUS),
      default: B2B_CONVERSION_STATUS.PENDING,
    },
    loginEmail: { type: String, lowercase: true, trim: true },
    mobileNumber: { type: String, trim: true },
    companyName: { type: String, trim: true },
    companyAddress: { type: String, trim: true },
    enquiryFormSlug: { type: String, lowercase: true, trim: true },
    allowedServices: { type: [String], default: undefined },
    aadharDocUrl: { type: String },
    panDocUrl: { type: String },
    rejectionReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    createdAdminId: { type: Schema.Types.ObjectId, ref: "Admin" },
    createdAdvisorId: { type: Schema.Types.ObjectId, ref: "Advisor" },
  },
  { timestamps: true }
);

b2bConversionSchema.index({ b2bLeadId: 1 });
b2bConversionSchema.index({ status: 1, step: 1 });
b2bConversionSchema.index({ requestedBy: 1 });

export default mongoose.model<IB2BConversion>(
  "B2BConversion",
  b2bConversionSchema
);
