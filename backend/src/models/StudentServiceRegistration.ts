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
  registeredViaAdvisorId?: mongoose.Types.ObjectId; // Advisor who registered this service
  registeredViaAdminId?: mongoose.Types.ObjectId; // Admin who registered this service (post-transfer)
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
  planTier?: string;
  classTiming?: {
    batchDate: Date;
    timeFrom: string;
    timeTo: string;
  };
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: Date;
  // Payment system fields
  paymentModel?: string; // 'one-time' | 'installment'
  installmentPlan?: {
    totalInstallments: number;
    completedInstallments: number;
    schedule: Array<{
      number: number;
      percentage: number;
      amount: number;
      status: string; // 'pending' | 'due' | 'paid' | 'failed'
      label?: string; // e.g. 'Upgrade to PREMIUM'
      dueDate?: Date;
      paidAt?: Date;
      razorpayOrderId?: string;
    }>;
  };
  totalAmount?: number;
  discountedAmount?: number;
  totalPaid?: number;
  paymentComplete?: boolean;
  notes?: string;
  // Max number of report topics (career+dev pair) this student can generate
  maxReportGenerations?: number;
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
    registeredViaAdvisorId: {
      type: Schema.Types.ObjectId,
      ref: "Advisor",
      required: false,
    },
    registeredViaAdminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
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
    planTier: {
      type: String,
      default: undefined,
    },
    classTiming: {
      batchDate: { type: Date },
      timeFrom: { type: String },
      timeTo: { type: String },
    },
    paymentStatus: {
      type: String,
      default: undefined,
    },
    paymentAmount: {
      type: Number,
      default: undefined,
    },
    paymentDate: {
      type: Date,
      default: undefined,
    },
    // Payment system fields
    paymentModel: {
      type: String,
      enum: ['one-time', 'installment'],
      default: undefined,
    },
    installmentPlan: {
      totalInstallments: { type: Number, default: undefined },
      completedInstallments: { type: Number, default: 0 },
      schedule: [
        {
          number: { type: Number },
          percentage: { type: Number },
          amount: { type: Number },
          status: { type: String, enum: ['pending', 'due', 'paid', 'failed'], default: 'pending' },
          label: { type: String, default: undefined },
          dueDate: { type: Date, default: undefined },
          paidAt: { type: Date, default: undefined },
          razorpayOrderId: { type: String, default: undefined },
        },
      ],
    },
    totalAmount: {
      type: Number,
      default: undefined,
    },
    discountedAmount: {
      type: Number,
      default: undefined,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    paymentComplete: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: undefined,
    },
    maxReportGenerations: {
      type: Number,
      default: 2,
    },
  },
  { timestamps: true }
);

// Compound index: for non-coaching services, one registration per service.
// For coaching-classes, one registration per service + planTier (allows multiple classes).
studentServiceRegistrationSchema.index(
  { studentId: 1, serviceId: 1, planTier: 1 },
  { unique: true }
);

export default mongoose.model<IStudentServiceRegistration>(
  "StudentServiceRegistration",
  studentServiceRegistrationSchema
);


