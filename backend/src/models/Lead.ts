import mongoose, { Document, Schema } from "mongoose";

export enum SERVICE_TYPE {
  EDUCATION_PLANNING = "Education Planning",
  CAREER_FOCUS_STUDY_ABROAD = "Career Focus Study Abroad",
  IVY_LEAGUE_ADMISSION = "Ivy League Admission",
  COACHING_CLASSES = "Coaching Classes",
}

export enum LEAD_STAGE {
  NEW = "New",
  HOT = "Hot",
  WARM = "Warm",
  COLD = "Cold",
  CONVERTED = "Converted to Student",
  CLOSED = "Closed",
}

export interface ILeadParentDetail {
  firstName: string;
  middleName?: string;
  lastName: string;
  relationship: string;
  mobileNumber: string;
  email: string;
  qualification: string;
  occupation: string;
}

export interface ILead extends Document {
  name: string;
  email: string;
  mobileNumber: string;
  city?: string;
  serviceTypes: SERVICE_TYPE[];
  intake?: string;
  year?: string;
  parentDetail?: ILeadParentDetail;
  adminId?: mongoose.Types.ObjectId;
  advisorId?: mongoose.Types.ObjectId;
  assignedCounselorId?: mongoose.Types.ObjectId;
  referrerId?: mongoose.Types.ObjectId;
  stage: LEAD_STAGE;
  source: string;
  conversionRequestId?: mongoose.Types.ObjectId;
  conversionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: Date;
  updatedAt?: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    intake: {
      type: String,
      trim: true,
      required: false,
    },
    year: {
      type: String,
      trim: true,
      required: false,
    },
    parentDetail: {
      firstName: { type: String, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      relationship: { type: String, trim: true },
      mobileNumber: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      qualification: { type: String, trim: true },
      occupation: { type: String, trim: true },
    },
    serviceTypes: {
      type: [String],
      enum: Object.values(SERVICE_TYPE),
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one service type is required",
      },
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "Advisor",
      default: null,
    },
    assignedCounselorId: {
      type: Schema.Types.ObjectId,
      ref: "Counselor",
      default: null,
    },
    stage: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      default: LEAD_STAGE.NEW,
    },
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Referrer",
      default: null,
    },
    source: {
      type: String,
      default: "Enquiry Form",
    },
    conversionRequestId: {
      type: Schema.Types.ObjectId,
      ref: "LeadStudentConversion",
      default: null,
    },
    conversionStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ adminId: 1, stage: 1 });
leadSchema.index({ advisorId: 1, stage: 1 });
leadSchema.index({ assignedCounselorId: 1, stage: 1 });
leadSchema.index({ email: 1, adminId: 1 });

export default mongoose.model<ILead>("Lead", leadSchema);
