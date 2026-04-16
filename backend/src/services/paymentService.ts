import Invoice, { InvoiceType, InvoiceStatus } from '../models/Invoice';
import Ledger, { LedgerEntryType } from '../models/Ledger';
import User from '../models/User';
import Student from '../models/Student';

// ===== Invoice Number Generation =====

export const generateInvoiceNumber = async (type: InvoiceType): Promise<string> => {
  const prefix = type === InvoiceType.PROFORMA ? 'KS-PF' : 'KS-INV';
  const year = new Date().getFullYear();

  const lastInvoice = await Invoice.findOne({
    invoiceNumber: { $regex: `^${prefix}-${year}-` },
  })
    .sort({ invoiceNumber: -1 })
    .lean();

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${year}-${String(nextNum).padStart(5, '0')}`;
};

// ===== Create Proforma Invoice =====

export const createProformaInvoice = async (params: {
  registrationId: string;
  studentId: string;
  adminId?: string;
  advisorId?: string;
  serviceName: string;
  serviceSlug: string;
  planTier: string;
  totalAmount: number;
  discountAmount?: number;
  installmentNumber?: number;
  installmentPercentage?: number;
  installmentAmount?: number;
}): Promise<any> => {
  const student = await Student.findById(params.studentId).populate('userId').lean();
  const studentUser = student?.userId as any;

  const invoiceNumber = await generateInvoiceNumber(InvoiceType.PROFORMA);

  const discountAmt = params.discountAmount || 0;
  // GST rate is 18% for education services in India
  const gstRate = 18;
  // totalAmount is GST-inclusive — reverse-calculate base (same as createTaxInvoice)
  const grandTotal = params.totalAmount - discountAmt;
  const taxableAmount = Math.round(grandTotal * 100 / (100 + gstRate));
  const gstAmount = grandTotal - taxableAmount;

  const invoice = await Invoice.create({
    invoiceNumber,
    type: InvoiceType.PROFORMA,
    registrationId: params.registrationId,
    studentId: params.studentId,
    adminId: params.adminId,
    advisorId: params.advisorId,
    studentName: studentUser
      ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ')
      : 'Student',
    studentEmail: studentUser?.email || '',
    studentPhone: studentUser?.phone || undefined,
    serviceName: params.serviceName,
    serviceSlug: params.serviceSlug,
    planTier: params.planTier,
    totalAmount: taxableAmount,
    discountAmount: discountAmt,
    taxableAmount,
    gstRate,
    gstAmount,
    grandTotal,
    installmentNumber: params.installmentNumber,
    installmentPercentage: params.installmentPercentage,
    installmentAmount: params.installmentAmount,
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date(),
  });

  return invoice;
};

// ===== Create Tax Invoice (after payment) =====
// amount = GST-inclusive amount that was actually charged/paid

export const createTaxInvoice = async (params: {
  registrationId: string;
  paymentId: string;
  studentId: string;
  adminId?: string;
  advisorId?: string;
  serviceName: string;
  serviceSlug: string;
  planTier: string;
  amount: number; // GST-inclusive amount paid
  discountAmount?: number;
  installmentNumber?: number;
  installmentPercentage?: number;
}): Promise<any> => {
  const student = await Student.findById(params.studentId).populate('userId').lean();
  const studentUser = student?.userId as any;

  const invoiceNumber = await generateInvoiceNumber(InvoiceType.TAX_INVOICE);

  const GST_RATE = 18;
  // Reverse-calculate base from GST-inclusive amount
  const grandTotal = params.amount;
  const taxableAmount = Math.round(grandTotal * 100 / (100 + GST_RATE));
  const gstAmount = grandTotal - taxableAmount;

  const invoice = await Invoice.create({
    invoiceNumber,
    type: InvoiceType.TAX_INVOICE,
    registrationId: params.registrationId,
    paymentId: params.paymentId,
    studentId: params.studentId,
    adminId: params.adminId,
    advisorId: params.advisorId,
    studentName: studentUser
      ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ')
      : 'Student',
    studentEmail: studentUser?.email || '',
    studentPhone: studentUser?.phone || undefined,
    serviceName: params.serviceName,
    serviceSlug: params.serviceSlug,
    planTier: params.planTier,
    totalAmount: taxableAmount,
    discountAmount: params.discountAmount || 0,
    taxableAmount,
    gstRate: GST_RATE,
    gstAmount,
    grandTotal,
    installmentNumber: params.installmentNumber,
    installmentPercentage: params.installmentPercentage,
    installmentAmount: grandTotal,
    status: InvoiceStatus.PAID,
    issuedAt: new Date(),
    paidAt: new Date(),
  });

  return invoice;
};

// ===== Ledger Operations =====

export const createOrUpdateLedger = async (params: {
  registrationId: string;
  studentId: string;
  totalServiceAmount: number;
  discountAmount?: number;
  entry: {
    type: LedgerEntryType;
    description: string;
    invoiceId?: string;
    paymentId?: string;
    debit: number;
    credit: number;
  };
}): Promise<any> => {
  let ledger = await Ledger.findOne({ registrationId: params.registrationId });

  const discountAmt = params.discountAmount || 0;
  const netPayable = params.totalServiceAmount - discountAmt;

  if (!ledger) {
    // Create new ledger
    const runningBalance = params.entry.debit - params.entry.credit;
    ledger = await Ledger.create({
      registrationId: params.registrationId,
      studentId: params.studentId,
      totalServiceAmount: params.totalServiceAmount,
      totalDiscount: discountAmt,
      netPayable,
      totalPaid: params.entry.credit,
      balance: netPayable - params.entry.credit,
      entries: [
        {
          date: new Date(),
          type: params.entry.type,
          description: params.entry.description,
          invoiceId: params.entry.invoiceId,
          paymentId: params.entry.paymentId,
          debit: params.entry.debit,
          credit: params.entry.credit,
          runningBalance,
        },
      ],
    });
  } else {
    // Get last running balance
    const lastBalance =
      ledger.entries.length > 0
        ? ledger.entries[ledger.entries.length - 1].runningBalance
        : 0;

    const newRunningBalance = lastBalance + params.entry.debit - params.entry.credit;

    ledger.entries.push({
      date: new Date(),
      type: params.entry.type,
      description: params.entry.description,
      invoiceId: params.entry.invoiceId as any,
      paymentId: params.entry.paymentId as any,
      debit: params.entry.debit,
      credit: params.entry.credit,
      runningBalance: newRunningBalance,
    });

    // Update totals
    if (params.entry.type === LedgerEntryType.PAYMENT) {
      ledger.totalPaid += params.entry.credit;
    }
    if (params.entry.type === LedgerEntryType.DISCOUNT) {
      ledger.totalDiscount += params.entry.credit;
      ledger.netPayable = ledger.totalServiceAmount - ledger.totalDiscount;
    }
    ledger.balance = ledger.netPayable - ledger.totalPaid;

    await ledger.save();
  }

  return ledger;
};

// ===== Get installment schedule for study abroad =====

export const buildInstallmentSchedule = (totalAmount: number) => {
  const inst1 = Math.round(totalAmount * 0.50);
  const inst2 = Math.round(totalAmount * 0.30);
  const inst3 = totalAmount - inst1 - inst2; // remainder to avoid rounding issues

  return {
    totalInstallments: 3,
    completedInstallments: 0,
    schedule: [
      { number: 1, percentage: 50, amount: inst1, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
      { number: 2, percentage: 30, amount: inst2, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
      { number: 3, percentage: 20, amount: inst3, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
    ],
  };
};
