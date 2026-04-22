import mongoose, { Document, Schema } from "mongoose";

export interface IAdvisorDocument {
  type: string;
  url: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string;
  fileName?: string;
  mimeType?: string;
}

export interface IAdvisor extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  companyName?: string;
  companyLogo?: string;
  address?: string;
  enquiryFormSlug?: string;
  allowedServices: string[]; // service slugs e.g. ["study-abroad", "coaching-classes"]
  isActive: boolean;
  isOnboarded: boolean;
  assignedB2BOpsId?: mongoose.Types.ObjectId;
  b2bLeadId?: mongoose.Types.ObjectId;
  documents: IAdvisorDocument[];
  onboardingSubmittedAt?: Date;
  b2bProfileData?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const advisorSchema = new Schema<IAdvisor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    companyLogo: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    enquiryFormSlug: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    allowedServices: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    assignedB2BOpsId: {
      type: Schema.Types.ObjectId,
      ref: "B2BOps",
      default: null,
    },
    b2bLeadId: {
      type: Schema.Types.ObjectId,
      ref: "B2BLead",
      default: null,
    },
    documents: {
      type: [
        {
          type: { type: String, required: true },
          url: { type: String, required: true },
          status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
          },
          rejectReason: { type: String },
          fileName: { type: String },
          mimeType: { type: String },
        },
      ],
      default: [],
    },
    onboardingSubmittedAt: {
      type: Date,
      default: null,
    },
    b2bProfileData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

advisorSchema.index({ userId: 1 });
advisorSchema.index({ enquiryFormSlug: 1 });

// Explicitly set collection name to "advisories" to match existing MongoDB collection
export default mongoose.model<IAdvisor>("Advisor", advisorSchema);
