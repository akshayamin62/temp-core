import mongoose, { Document, Schema } from "mongoose";

export interface IAdvisory extends Document {
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

const advisorySchema = new Schema<IAdvisory>(
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

advisorySchema.index({ userId: 1 });
advisorySchema.index({ enquiryFormSlug: 1 });

export default mongoose.model<IAdvisory>("Advisory", advisorySchema);
