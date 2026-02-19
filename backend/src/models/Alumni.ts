import mongoose, { Document, Schema } from "mongoose";

export interface IAlumni extends Document {
  userId: mongoose.Types.ObjectId;
  email?: string;
  mobileNumber?: string;
  graduationYear?: string;
  institution?: string;
  specialization?: string;
  currentPosition?: string;
  currentCompany?: string;
  linkedinProfile?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const alumniSchema = new Schema<IAlumni>(
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
    graduationYear: {
      type: String,
      required: false,
      trim: true,
    },
    institution: {
      type: String,
      required: false,
      trim: true,
    },
    specialization: {
      type: String,
      required: false,
      trim: true,
    },
    currentPosition: {
      type: String,
      required: false,
      trim: true,
    },
    currentCompany: {
      type: String,
      required: false,
      trim: true,
    },
    linkedinProfile: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true }
);

// Database indexes for performance
alumniSchema.index({ email: 1 });
alumniSchema.index({ graduationYear: 1 });
alumniSchema.index({ institution: 1 });

export default mongoose.model<IAlumni>("Alumni", alumniSchema);
