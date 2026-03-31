import mongoose, { Document, Schema } from 'mongoose';

export enum PlanDiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface IStudentPlanDiscount extends Document {
  studentId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  serviceSlug: string;
  planTier: string;

  type: PlanDiscountType;
  value: number; // e.g., 10 for 10%, or 5000 for ₹5000 off
  calculatedAmount: number; // actual discount in INR

  reason?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

const studentPlanDiscountSchema = new Schema<IStudentPlanDiscount>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    serviceSlug: {
      type: String,
      required: true,
    },
    planTier: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(PlanDiscountType),
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    calculatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      default: undefined,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// One active discount per student per service per plan
studentPlanDiscountSchema.index({ studentId: 1, serviceSlug: 1, planTier: 1 });
studentPlanDiscountSchema.index({ adminId: 1, studentId: 1 });

export default mongoose.model<IStudentPlanDiscount>('StudentPlanDiscount', studentPlanDiscountSchema);
