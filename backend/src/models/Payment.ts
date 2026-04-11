import mongoose, { Document, Schema } from 'mongoose';

export enum PaymentStatus {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  SERVICE = 'service',
  MISCELLANEOUS = 'miscellaneous',
}

export interface IPayment extends Document {
  registrationId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  advisoryId?: mongoose.Types.ObjectId;

  // Razorpay fields
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  // Amount
  amountInr: number; // in INR
  currency: string;

  // Type & installment tracking
  type: PaymentType;
  installmentNumber: number;
  installmentPercentage: number;

  // Status
  status: PaymentStatus;
  paidAt?: Date;

  // Discount applied to this payment
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;

  // Metadata
  description?: string;
  notes?: Record<string, string>;

  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      default: undefined,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: undefined,
    },
    advisoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Advisory',
      default: undefined,
    },

    // Razorpay
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: undefined,
    },
    razorpaySignature: {
      type: String,
      default: undefined,
    },

    // Amount
    amountInr: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Type & installment tracking
    type: {
      type: String,
      enum: Object.values(PaymentType),
      default: PaymentType.SERVICE,
    },
    installmentNumber: {
      type: Number,
      default: 1,
    },
    installmentPercentage: {
      type: Number,
      default: 100,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
    },
    paidAt: {
      type: Date,
      default: undefined,
    },

    // Discount
    discountAmount: {
      type: Number,
      default: undefined,
    },
    discountType: {
      type: String,
      default: undefined,
    },
    discountValue: {
      type: Number,
      default: undefined,
    },

    // Metadata
    description: {
      type: String,
      default: undefined,
    },
    notes: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ registrationId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);
