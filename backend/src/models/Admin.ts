import mongoose, { Document, Schema } from "mongoose";

export interface IAdminDocument {
  type: string; // e.g. "aadhar", "pan"
  url: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string;
  fileName?: string;
  mimeType?: string;
}

export interface IAdmin extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  companyName?: string;
  address?: string;
  companyLogo?: string;
  enquiryFormSlug?: string; // Unique slug for enquiry form URL
  isOnboarded: boolean;
  assignedB2BOpsId?: mongoose.Types.ObjectId;
  b2bLeadId?: mongoose.Types.ObjectId;
  documents: IAdminDocument[];
  onboardingSubmittedAt?: Date;
  b2bProfileData?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminSchema = new Schema<IAdmin>(
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
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty if not required
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    companyLogo: {
      type: String,
      required: false,
    },
    enquiryFormSlug: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
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

export default mongoose.model<IAdmin>("Admin", adminSchema);
