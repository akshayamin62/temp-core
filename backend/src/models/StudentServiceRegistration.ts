import mongoose, { Document, Schema } from "mongoose";

export enum ServiceRegistrationStatus {
  REGISTERED = "REGISTERED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface IStudentServiceRegistration extends Document {
  studentId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  // For Study Abroad service - OPS role
  primaryOpsId?: mongoose.Types.ObjectId;
  secondaryOpsId?: mongoose.Types.ObjectId;
  activeOpsId?: mongoose.Types.ObjectId;
  // For Ivy League service - IVY_EXPERT role
  primaryIvyExpertId?: mongoose.Types.ObjectId;
  secondaryIvyExpertId?: mongoose.Types.ObjectId;
  activeIvyExpertId?: mongoose.Types.ObjectId;
  // For Education Planning service - EDUPLAN_COACH role
  primaryEduplanCoachId?: mongoose.Types.ObjectId;
  secondaryEduplanCoachId?: mongoose.Types.ObjectId;
  activeEduplanCoachId?: mongoose.Types.ObjectId;
  // Ivy League scoring
  overallScore?: number;
  studentInterest?: string;
  status: ServiceRegistrationStatus;
  registeredAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  paymentStatus?: string;
  paymentAmount?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentServiceRegistrationSchema = new Schema<IStudentServiceRegistration>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    // For Study Abroad service - OPS role
    primaryOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    secondaryOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    activeOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    // For Ivy League service - IVY_EXPERT role
    primaryIvyExpertId: {
      type: Schema.Types.ObjectId,
      ref: "IvyExpert",
      required: false,
    },
    secondaryIvyExpertId: {
      type: Schema.Types.ObjectId,
      ref: "IvyExpert",
      required: false,
    },
    activeIvyExpertId: {
      type: Schema.Types.ObjectId,
      ref: "IvyExpert",
      required: false,
    },
    // For Education Planning service - EDUPLAN_COACH role
    primaryEduplanCoachId: {
      type: Schema.Types.ObjectId,
      ref: "EduplanCoach",
      required: false,
    },
    secondaryEduplanCoachId: {
      type: Schema.Types.ObjectId,
      ref: "EduplanCoach",
      required: false,
    },
    activeEduplanCoachId: {
      type: Schema.Types.ObjectId,
      ref: "EduplanCoach",
      required: false,
    },
    // Ivy League scoring
    overallScore: {
      type: Number,
      default: undefined,
    },
    studentInterest: {
      type: String,
      default: undefined,
    },
    status: {
      type: String,
      enum: Object.values(ServiceRegistrationStatus),
      default: ServiceRegistrationStatus.REGISTERED,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: undefined,
    },
    cancelledAt: {
      type: Date,
      default: undefined,
    },
    paymentStatus: {
      type: String,
      default: undefined,
    },
    paymentAmount: {
      type: Number,
      default: undefined,
    },
    notes: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a student can only register once per service
studentServiceRegistrationSchema.index(
  { studentId: 1, serviceId: 1 },
  { unique: true }
);

export default mongoose.model<IStudentServiceRegistration>(
  "StudentServiceRegistration",
  studentServiceRegistrationSchema
);


