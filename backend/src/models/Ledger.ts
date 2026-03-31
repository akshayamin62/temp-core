import mongoose, { Document, Schema } from 'mongoose';

export enum LedgerEntryType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  DISCOUNT = 'discount',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export interface ILedgerEntry {
  date: Date;
  type: LedgerEntryType;
  description: string;
  invoiceId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface ILedger extends Document {
  registrationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  totalServiceAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;

  entries: ILedgerEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    date: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: Object.values(LedgerEntryType),
      required: true,
    },
    description: { type: String, required: true },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: undefined,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: undefined,
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    runningBalance: { type: Number, required: true },
  },
  { _id: true }
);

const ledgerSchema = new Schema<ILedger>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      required: true,
      unique: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    totalServiceAmount: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    netPayable: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, required: true },

    entries: [ledgerEntrySchema],
  },
  { timestamps: true }
);

ledgerSchema.index({ registrationId: 1 });
ledgerSchema.index({ studentId: 1 });

export default mongoose.model<ILedger>('Ledger', ledgerSchema);
