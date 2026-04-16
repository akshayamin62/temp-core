import mongoose, { Document, Schema } from "mongoose";

export interface IAdvisor extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  companyName: string;
  companyLogo?: string;
  address?: string;
  enquiryFormSlug: string;
  allowedServices: string[]; // service slugs e.g. ["study-abroad", "coaching-classes"]
  isActive: boolean;
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
      required: true,
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
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    allowedServices: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one allowed service is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

advisorSchema.index({ userId: 1 });
advisorSchema.index({ enquiryFormSlug: 1 });

// Explicitly set collection name to "advisories" to match existing MongoDB collection
export default mongoose.model<IAdvisor>("Advisor", advisorSchema);
