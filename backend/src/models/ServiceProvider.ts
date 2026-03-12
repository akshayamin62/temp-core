import mongoose, { Document, Schema } from "mongoose";

export interface IServiceProvider extends Document {
  userId: mongoose.Types.ObjectId;
  email?: string;
  mobileNumber?: string;
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  gstNumber?: string;
  businessPan?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  website?: string;
  companyLogo?: string;
  servicesOffered?: string[];
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankAccountType?: string;
  bankSwiftCode?: string;
  bankUpiId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const serviceProviderSchema = new Schema<IServiceProvider>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    businessType: {
      type: String,
      required: false,
      enum: [
        'Individual',
        'Sole Proprietors',
        'Partnership Firm',
        'Private Ltd. Company',
        'Public Ltd. Company',
        'Limited Liability Partnership (LLP)',
        'Trust, Association, Society, Club',
        'Government Entity'
      ],
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: false,
      trim: true,
    },
    gstNumber: {
      type: String,
      required: false,
      trim: true,
    },
    businessPan: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    pincode: {
      type: String,
      required: false,
      trim: true,
    },
    website: {
      type: String,
      required: false,
      trim: true,
    },
    companyLogo: {
      type: String,
      required: false,
      default: "",
    },
    bankName: {
      type: String,
      required: false,
      trim: true,
    },
    bankAccountNumber: {
      type: String,
      required: false,
      trim: true,
    },
    bankIfscCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },
    bankAccountType: {
      type: String,
      required: false,
      enum: ['Savings', 'Current'],
      trim: true,
    },
    bankSwiftCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
    },
    bankUpiId: {
      type: String,
      required: false,
      trim: true,
    },
    servicesOffered: {
      type: [String],
      required: false,
      default: [],
    },
  },
  { timestamps: true }
);

// Database indexes for performance
serviceProviderSchema.index({ email: 1 });
serviceProviderSchema.index({ companyName: 1 });
serviceProviderSchema.index({ businessType: 1 });

export default mongoose.model<IServiceProvider>("ServiceProvider", serviceProviderSchema);
