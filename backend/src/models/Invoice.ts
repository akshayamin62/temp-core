import mongoose, { Document, Schema } from 'mongoose';

export enum InvoiceType {
  PROFORMA = 'proforma',
  TAX_INVOICE = 'tax-invoice',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  VOID = 'void',
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  type: InvoiceType;

  registrationId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;

  // Student details snapshot
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentAddress?: string;

  // Admin/Company details snapshot
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;

  // Service details
  serviceName: string;
  serviceSlug: string;
  planTier: string;

  // Amounts
  totalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;

  // Installment
  installmentNumber?: number;
  installmentPercentage?: number;
  installmentAmount?: number;

  // Status
  status: InvoiceStatus;
  issuedAt?: Date;
  paidAt?: Date;
  dueDate?: Date;

  // PDF
  pdfPath?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(InvoiceType),
      required: true,
    },

    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      default: undefined,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
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

    // Student details snapshot
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentPhone: { type: String, default: undefined },
    studentAddress: { type: String, default: undefined },

    // Admin/Company details snapshot
    companyName: { type: String, default: undefined },
    companyAddress: { type: String, default: undefined },
    companyGSTIN: { type: String, default: undefined },

    // Service details
    serviceName: { type: String, required: true },
    serviceSlug: { type: String, required: true },
    planTier: { type: String, required: true },

    // Amounts
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    // Installment
    installmentNumber: { type: Number, default: undefined },
    installmentPercentage: { type: Number, default: undefined },
    installmentAmount: { type: Number, default: undefined },

    // Status
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
    },
    issuedAt: { type: Date, default: undefined },
    paidAt: { type: Date, default: undefined },
    dueDate: { type: Date, default: undefined },

    // PDF
    pdfPath: { type: String, default: undefined },
  },
  { timestamps: true }
);

invoiceSchema.index({ registrationId: 1 });
invoiceSchema.index({ studentId: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ type: 1, status: 1 });

export default mongoose.model<IInvoice>('Invoice', invoiceSchema);
