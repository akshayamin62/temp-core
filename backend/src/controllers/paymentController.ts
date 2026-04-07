import { Response } from 'express';
import crypto from 'crypto';
import razorpay from '../config/razorpay';
import { AuthRequest } from '../middleware/auth';
import Payment, { PaymentStatus, PaymentType } from '../models/Payment';
import StudentServiceRegistration, { ServiceRegistrationStatus } from '../models/StudentServiceRegistration';
import Service from '../models/Service';
import Student from '../models/Student';
import StudentPlanDiscount from '../models/StudentPlanDiscount';
import ServicePricing from '../models/ServicePricing';
import User from '../models/User';
import Admin from '../models/Admin';
import Counselor from '../models/Counselor';
import Ops from '../models/Ops';
import Parent from '../models/Parent';
import Referrer from '../models/Referrer';
import EduplanCoach from '../models/EduplanCoach';
import { USER_ROLE } from '../types/roles';
import { sendServiceRegistrationEmailToSuperAdmin } from '../utils/email';
import {
  createTaxInvoice,
  createProformaInvoice,
  createOrUpdateLedger,
  buildInstallmentSchedule,
} from '../services/paymentService';
import { LedgerEntryType } from '../models/Ledger';
import Ledger from '../models/Ledger';

// Verify requesting user is connected to the student
const verifyStudentAccess = async (userId: string, role: string, studentId: string): Promise<boolean> => {
  switch (role) {
    case USER_ROLE.SUPER_ADMIN:
      return true;
    case USER_ROLE.STUDENT: {
      const student = await Student.findById(studentId).select('userId').lean();
      return student?.userId?.toString() === userId;
    }
    case USER_ROLE.ADMIN: {
      const admin = await Admin.findOne({ userId }).select('_id').lean();
      if (!admin) return false;
      const student = await Student.findOne({ _id: studentId, adminId: admin._id }).select('_id').lean();
      return !!student;
    }
    case USER_ROLE.COUNSELOR: {
      const counselor = await Counselor.findOne({ userId }).select('_id').lean();
      if (!counselor) return false;
      const student = await Student.findOne({ _id: studentId, counselorId: counselor._id }).select('_id').lean();
      return !!student;
    }
    case USER_ROLE.OPS: {
      const ops = await Ops.findOne({ userId }).select('_id').lean();
      if (!ops) return false;
      const reg = await StudentServiceRegistration.findOne({
        studentId,
        $or: [{ primaryOpsId: ops._id }, { secondaryOpsId: ops._id }, { activeOpsId: ops._id }],
      }).select('_id').lean();
      return !!reg;
    }
    case USER_ROLE.PARENT: {
      const parent = await Parent.findOne({ userId }).select('studentIds').lean();
      return parent?.studentIds?.some((id: any) => id.toString() === studentId) ?? false;
    }
    case USER_ROLE.REFERRER: {
      const referrer = await Referrer.findOne({ userId }).select('_id').lean();
      if (!referrer) return false;
      const student = await Student.findOne({ _id: studentId, referrerId: referrer._id }).select('_id').lean();
      return !!student;
    }
    case USER_ROLE.EDUPLAN_COACH: {
      const coach = await EduplanCoach.findOne({ userId }).select('_id').lean();
      if (!coach) return false;
      const reg = await StudentServiceRegistration.findOne({
        studentId,
        $or: [{ primaryEduplanCoachId: coach._id }, { secondaryEduplanCoachId: coach._id }, { activeEduplanCoachId: coach._id }],
      }).select('_id').lean();
      return !!reg;
    }
    default:
      return false;
  }
};

// ===== Create Razorpay Order =====

export const createOrder = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId, installmentNumber } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const service = await Service.findById(registration.serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Get student's adminId
    const student = await Student.findById(registration.studentId).lean();
    const adminId = student?.adminId?.toString();

    // Auto-initialize payment model if not set
    if (!registration.paymentModel) {
      const GST_RATE = 18;
      if (service.slug === 'study-abroad') {
        const baseAmount = registration.discountedAmount ?? registration.totalAmount ?? registration.paymentAmount ?? 0;
        if (baseAmount > 0) {
          const gstAmount = Math.round(baseAmount * GST_RATE / 100);
          const netPayable = baseAmount + gstAmount;
          registration.paymentModel = 'installment';
          registration.installmentPlan = buildInstallmentSchedule(netPayable);
          registration.installmentPlan.schedule[0].status = 'due';
          registration.paymentStatus = 'pending';
          await registration.save();
        }
      } else {
        registration.paymentModel = 'one-time';
        await registration.save();
      }
    }

    // Determine payment amount (already GST-inclusive for installments)
    let amountInr: number;
    let instNumber = installmentNumber || 1;
    let instPercentage = 100;

    if (registration.paymentModel === 'installment' && registration.installmentPlan) {
      // Installment-based (study-abroad) - amounts include GST
      const schedule = registration.installmentPlan.schedule;
      const installment = schedule.find((s) => s.number === instNumber);

      if (!installment) {
        return res.status(400).json({ success: false, message: `Installment #${instNumber} not found` });
      }

      if (installment.status === 'paid') {
        return res.status(400).json({ success: false, message: `Installment #${instNumber} is already paid` });
      }

      // Check previous installments are paid
      if (instNumber > 1) {
        const previousUnpaid = schedule.find(
          (s) => s.number < instNumber && s.status !== 'paid'
        );
        if (previousUnpaid) {
          return res.status(400).json({
            success: false,
            message: `Previous installment #${previousUnpaid.number} must be paid first`,
          });
        }
      }

      amountInr = installment.amount; // GST-inclusive
      instPercentage = installment.percentage;
    } else {
      // One-time payment — add GST on top of base amount
      const GST_RATE = 18;
      const baseAmount = registration.discountedAmount ?? registration.totalAmount ?? registration.paymentAmount;
      if (!baseAmount || baseAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount' });
      }
      const gstAmount = Math.round(baseAmount * GST_RATE / 100);
      amountInr = baseAmount + gstAmount; // GST-inclusive
    }

    const amountInPaise = Math.round(amountInr * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${registration._id}_${instNumber}`,
      notes: {
        registrationId: registration._id.toString(),
        studentId: registration.studentId.toString(),
        serviceSlug: service.slug,
        installmentNumber: String(instNumber),
      },
    });

    // Create Payment record
    const payment = await Payment.create({
      registrationId: registration._id,
      studentId: registration.studentId,
      adminId,
      razorpayOrderId: order.id,
      amountInr,
      currency: 'INR',
      type: PaymentType.SERVICE,
      installmentNumber: instNumber,
      installmentPercentage: instPercentage,
      status: PaymentStatus.CREATED,
      description: `Payment for ${service.name} - ${registration.planTier || 'Standard'} (Inst. #${instNumber})`,
    });

    // Update installment schedule with order ID
    if (registration.paymentModel === 'installment' && registration.installmentPlan) {
      const scheduleItem = registration.installmentPlan.schedule.find(
        (s) => s.number === instNumber
      );
      if (scheduleItem) {
        scheduleItem.status = 'due';
        scheduleItem.razorpayOrderId = order.id;
        await registration.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        amount: amountInPaise,
        amountInr,
        currency: 'INR',
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Verify Payment (Razorpay callback) =====

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Verify signature using HMAC SHA256
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed - invalid signature' });
    }

    // Find the payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: { payment },
      });
    }

    // Update payment status
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = PaymentStatus.CAPTURED;
    payment.paidAt = new Date();
    await payment.save();

    // Update registration
    const registration = await StudentServiceRegistration.findById(payment.registrationId);
    if (registration) {
      const service = await Service.findById(registration.serviceId);
      const serviceName = service?.name || 'Service';
      const serviceSlug = service?.slug || '';

      // Get student's adminId for invoice
      const student = await Student.findById(registration.studentId).lean();
      const adminId = student?.adminId?.toString() || payment.adminId?.toString();

      // Update payment totals (GST-inclusive)
      registration.totalPaid = (registration.totalPaid || 0) + payment.amountInr;
      registration.paymentDate = new Date();

      // Update installment tracking
      if (registration.paymentModel === 'installment' && registration.installmentPlan) {
        const scheduleItem = registration.installmentPlan.schedule.find(
          (s) => s.number === payment.installmentNumber
        );
        if (scheduleItem) {
          scheduleItem.status = 'paid';
          scheduleItem.paidAt = new Date();
        }
        registration.installmentPlan.completedInstallments =
          registration.installmentPlan.schedule.filter((s) => s.status === 'paid').length;

        // Check if all installments paid
        if (
          registration.installmentPlan.completedInstallments >=
          registration.installmentPlan.totalInstallments
        ) {
          registration.paymentComplete = true;
          registration.paymentStatus = 'paid';
        } else {
          registration.paymentStatus = 'partial';
        }

        // Mark next installment as due (if any)
        if (!registration.paymentComplete) {
          const nextInst = registration.installmentPlan.schedule.find(
            (s) => s.status === 'pending'
          );
          if (nextInst) {
            nextInst.status = 'due';
          }
        }
      } else {
        // One-time payment
        registration.paymentComplete = true;
        registration.paymentStatus = 'paid';
      }

      registration.paymentAmount = registration.totalPaid;
      await registration.save();

      // Create Tax Invoice (amount is GST-inclusive, invoice will extract GST)
      const invoice = await createTaxInvoice({
        registrationId: registration._id.toString(),
        paymentId: payment._id.toString(),
        studentId: registration.studentId.toString(),
        adminId,
        serviceName,
        serviceSlug,
        planTier: registration.planTier || 'Standard',
        amount: payment.amountInr, // GST-inclusive
        installmentNumber: payment.installmentNumber,
        installmentPercentage: payment.installmentPercentage,
      });

      // Calculate net payable for ledger (sum of all installment amounts)
      let netPayable = payment.amountInr;
      if (registration.installmentPlan) {
        netPayable = registration.installmentPlan.schedule.reduce((sum, s) => sum + s.amount, 0);
      }

      // Update Ledger
      await createOrUpdateLedger({
        registrationId: registration._id.toString(),
        studentId: registration.studentId.toString(),
        totalServiceAmount: netPayable,
        discountAmount: 0,
        entry: {
          type: LedgerEntryType.PAYMENT,
          description: `Payment received - ${serviceName} ${registration.planTier || ''} (Inst. #${payment.installmentNumber}) incl. GST`,
          invoiceId: invoice._id.toString(),
          paymentId: payment._id.toString(),
          debit: 0,
          credit: payment.amountInr,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Request Next Installment (Staff triggers) =====

export const requestInstallment = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId, installmentNumber } = req.body;

    if (!registrationId || !installmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID and installment number are required',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.paymentModel !== 'installment' || !registration.installmentPlan) {
      return res.status(400).json({
        success: false,
        message: 'This registration does not use installment payments',
      });
    }

    // Delegate to createOrder with installment number
    req.body = { registrationId, installmentNumber };
    return createOrder(req, res);
  } catch (error: any) {
    console.error('Error requesting installment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Create Miscellaneous Collection =====

export const createMiscCollection = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, amount, description, notes } = req.body;

    if (!studentId || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, amount, and description are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order for misc collection
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `misc_${studentId.toString().slice(-10)}_${Date.now().toString(36)}`,
      notes: {
        studentId: studentId.toString(),
        type: 'miscellaneous',
        description,
        ...(notes || {}),
      },
    });

    // Create Payment record
    const payment = await Payment.create({
      studentId,
      adminId: req.user?.userId,
      razorpayOrderId: order.id,
      amountInr: amount,
      currency: 'INR',
      type: PaymentType.MISCELLANEOUS,
      installmentNumber: 1,
      installmentPercentage: 100,
      status: PaymentStatus.CREATED,
      description,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Miscellaneous collection order created',
      data: {
        orderId: order.id,
        amount: amountInPaise,
        amountInr: amount,
        currency: 'INR',
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error('Error creating misc collection:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Get Payments by Registration =====

export const getPaymentsByRegistration = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    // Verify the requesting user is connected to this registration's student
    const registration = await StudentServiceRegistration.findById(registrationId).select('studentId').lean();
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const hasAccess = await verifyStudentAccess(req.user!.userId, req.user!.role, registration.studentId.toString());
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payments = await Payment.find({ registrationId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { payments, count: payments.length },
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Get Payments by Student =====

export const getPaymentsByStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const hasAccess = await verifyStudentAccess(req.user!.userId, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payments = await Payment.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('registrationId', 'serviceId planTier status')
      .lean();

    return res.status(200).json({
      success: true,
      data: { payments, count: payments.length },
    });
  } catch (error: any) {
    console.error('Error fetching student payments:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Get Payment History (all payments for a student across services) =====

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const hasAccess = await verifyStudentAccess(req.user!.userId, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payments = await Payment.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    // Group by type
    const servicePayments = payments.filter((p) => p.type === PaymentType.SERVICE);
    const miscPayments = payments.filter((p) => p.type === PaymentType.MISCELLANEOUS);

    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.CAPTURED)
      .reduce((sum, p) => sum + p.amountInr, 0);

    return res.status(200).json({
      success: true,
      data: {
        payments,
        servicePayments,
        miscPayments,
        totalPaid,
        count: payments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Initialize Payment for Registration =====
// Called when a student registers for a service and we need to set up payment model

export const initializePayment = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.paymentModel) {
      return res.status(400).json({ success: false, message: 'Payment already initialized for this registration' });
    }

    const service = await Service.findById(registration.serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const totalAmount = registration.totalAmount || registration.paymentAmount || 0;
    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Total amount must be set before initializing payment' });
    }

    // Determine payment model based on service
    if (service.slug === 'study-abroad') {
      // Installment: 50/30/20
      const schedule = buildInstallmentSchedule(totalAmount);
      registration.paymentModel = 'installment';
      registration.installmentPlan = schedule;
    } else {
      // One-time payment for education-planning and coaching-classes
      registration.paymentModel = 'one-time';
    }

    registration.totalAmount = totalAmount;
    registration.totalPaid = 0;
    registration.paymentComplete = false;
    await registration.save();

    return res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        paymentModel: registration.paymentModel,
        totalAmount: registration.totalAmount,
        installmentPlan: registration.installmentPlan,
      },
    });
  } catch (error: any) {
    console.error('Error initializing payment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Set Price for a Registration =====
// Admin sets a custom totalAmount for a student's service registration
export const setPrice = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId, totalAmount } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required' });
    }
    if (totalAmount == null || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Total amount must be a positive number' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // If payment is already initialized with installments, don't allow price change
    if (registration.paymentModel && registration.totalPaid && registration.totalPaid > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change price after payments have been made. Use discount instead.',
      });
    }

    const oldAmount = registration.totalAmount;
    registration.totalAmount = totalAmount;

    // If payment model was already initialized, recalculate installment schedule
    if (registration.paymentModel === 'installment' && registration.installmentPlan) {
      const schedule = buildInstallmentSchedule(totalAmount);
      registration.installmentPlan = schedule;
      // Also clear discountedAmount since price base changed
      registration.discountedAmount = undefined;
    } else if (registration.paymentModel === 'one-time') {
      // Clear discountedAmount as well
      registration.discountedAmount = undefined;
    }

    await registration.save();

    return res.status(200).json({
      success: true,
      message: `Price updated from ₹${oldAmount || 0} to ₹${totalAmount}`,
      data: {
        registrationId: registration._id,
        totalAmount: registration.totalAmount,
        paymentModel: registration.paymentModel,
        installmentPlan: registration.installmentPlan,
      },
    });
  } catch (error: any) {
    console.error('Error setting price:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Create Registration Order (Pay-First Flow) =====
// Creates a Razorpay order for initial registration payment.
// Registration is created only after payment is verified via verifyRegistrationPayment.

export const createRegistrationOrder = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceSlug, planTier, classTiming } = req.body;
    const userId = req.user?.userId;
    const GST_RATE = 18;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!serviceSlug || !planTier) {
      return res.status(400).json({ success: false, message: 'serviceSlug and planTier are required' });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: 'Service not found or inactive' });
    }

    // Check for existing registration
    const isCoaching = serviceSlug === 'coaching-classes';
    if (isCoaching) {
      const existing = await StudentServiceRegistration.findOne({
        studentId: student._id, serviceId: service._id, planTier,
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Already registered for ${planTier}` });
      }
    } else {
      const existing = await StudentServiceRegistration.findOne({
        studentId: student._id, serviceId: service._id,
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Already registered for ${service.name}` });
      }
    }

    // Get pricing
    let basePrice = 0;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        basePrice = pricesObj[planTier] || 0;
      }
    }
    if (basePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Pricing not available for this plan' });
    }

    // Apply discount
    let discountAmt = 0;
    const planDiscount = await StudentPlanDiscount.findOne({
      studentId: student._id, serviceSlug, planTier, isActive: true,
    }).lean();
    if (planDiscount && planDiscount.calculatedAmount > 0) {
      discountAmt = planDiscount.calculatedAmount;
    }
    const netBase = Math.max(0, basePrice - discountAmt); // after discount, before GST
    const gstAmount = Math.round(netBase * GST_RATE / 100);
    const netPayableTotal = netBase + gstAmount; // full GST-inclusive amount

    // Determine how much to charge now
    let chargeNow: number;
    let instNumber = 1;
    let instPercentage = 100;
    let description: string;

    if (serviceSlug === 'study-abroad') {
      // 50% of total (installment 1)
      chargeNow = Math.round(netPayableTotal * 0.50);
      instPercentage = 50;
      description = `Registration - ${service.name} ${planTier} (Installment #1 - 50%)`;
    } else {
      // coaching-classes, education-planning: 100% upfront
      chargeNow = netPayableTotal;
      description = `Registration - ${service.name} ${planTier} (Full Payment)`;
    }

    const amountInPaise = Math.round(chargeNow * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `reg_${student._id.toString().slice(-10)}_${Date.now().toString(36)}`,
      notes: {
        studentId: student._id.toString(),
        serviceSlug,
        planTier,
        type: 'registration',
        basePrice: String(basePrice),
        discountAmt: String(discountAmt),
        netPayableTotal: String(netPayableTotal),
        ...(classTiming ? {
          batchDate: classTiming.batchDate,
          timeFrom: classTiming.timeFrom,
          timeTo: classTiming.timeTo,
        } : {}),
      },
    });

    // Create Payment record (no registrationId yet)
    const payment = await Payment.create({
      studentId: student._id,
      adminId: student.adminId,
      razorpayOrderId: order.id,
      amountInr: chargeNow,
      currency: 'INR',
      type: PaymentType.SERVICE,
      installmentNumber: instNumber,
      installmentPercentage: instPercentage,
      status: PaymentStatus.CREATED,
      description,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration order created',
      data: {
        orderId: order.id,
        amount: amountInPaise,
        amountInr: chargeNow,
        currency: 'INR',
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: [student.userId].filter(Boolean).join(' '),
        },
      },
    });
  } catch (error: any) {
    console.error('Error creating registration order:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Verify Registration Payment (Pay-First Flow) =====
// Verifies Razorpay payment and then creates the registration, invoices, and ledger.

export const verifyRegistrationPayment = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed - invalid signature' });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    if (payment.status === PaymentStatus.CAPTURED) {
      return res.status(200).json({ success: true, message: 'Payment already verified', data: { payment } });
    }

    // Update payment status
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = PaymentStatus.CAPTURED;
    payment.paidAt = new Date();

    // Get order notes for registration metadata
    const orderDetails = await razorpay.orders.fetch(razorpay_order_id);
    const notes = orderDetails.notes as Record<string, string>;
    const serviceSlug = notes.serviceSlug;
    const planTier = notes.planTier;
    const studentId = notes.studentId;
    const basePrice = Number(notes.basePrice);
    const discountAmt = Number(notes.discountAmt);
    const netPayableTotal = Number(notes.netPayableTotal);

    if (!serviceSlug || !planTier || !studentId) {
      return res.status(400).json({ success: false, message: 'Invalid order metadata' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const adminId = student.adminId?.toString();
    const GST_RATE = 18;
    const netBase = Math.max(0, basePrice - discountAmt);

    // ===== Create Registration =====
    const classTiming = notes.batchDate ? {
      batchDate: new Date(notes.batchDate),
      timeFrom: notes.timeFrom,
      timeTo: notes.timeTo,
    } : undefined;

    const isStudyAbroad = serviceSlug === 'study-abroad';
    const isInstallment = isStudyAbroad;

    const registration = await StudentServiceRegistration.create({
      studentId: student._id,
      serviceId: service._id,
      planTier,
      ...(classTiming ? { classTiming } : {}),
      status: ServiceRegistrationStatus.REGISTERED,
      paymentAmount: basePrice,
      totalAmount: basePrice,
      ...(discountAmt > 0 ? { discountedAmount: netBase } : {}),
      paymentModel: isInstallment ? 'installment' : 'one-time',
      paymentStatus: isInstallment ? 'partial' : 'paid',
      totalPaid: payment.amountInr,
      paymentDate: new Date(),
      paymentComplete: !isInstallment,
    });

    // Link payment to registration
    payment.registrationId = registration._id as any;
    await payment.save();

    const regId = registration._id.toString();
    const studId = (student._id as any).toString();

    if (isStudyAbroad) {
      // ===== Study Abroad: Installment setup =====
      const schedule = buildInstallmentSchedule(netPayableTotal);
      // Mark installment #1 as paid
      schedule.schedule[0].status = 'paid';
      schedule.schedule[0].paidAt = new Date();
      schedule.schedule[0].razorpayOrderId = razorpay_order_id;
      // Mark installment #2 as due
      schedule.schedule[1].status = 'due';
      schedule.completedInstallments = 1;

      registration.installmentPlan = schedule;
      await registration.save();

      // Invoice 1: Tax invoice for paid amount (installment #1)
      const taxInvoice = await createTaxInvoice({
        registrationId: regId,
        paymentId: payment._id.toString(),
        studentId: studId,
        adminId,
        serviceName: service.name,
        serviceSlug,
        planTier,
        amount: payment.amountInr, // GST-inclusive
        discountAmount: discountAmt,
        installmentNumber: 1,
        installmentPercentage: 50,
      });

      // Invoice 2: Proforma invoice for full service plan amount
      await createProformaInvoice({
        registrationId: regId,
        studentId: studId,
        adminId,
        serviceName: service.name,
        serviceSlug,
        planTier,
        totalAmount: netPayableTotal, // Full service plan amount (GST-inclusive)
        discountAmount: 0,
      });

      // Ledger entry 1: Full service charge (debit)
      await createOrUpdateLedger({
        registrationId: regId,
        studentId: studId,
        totalServiceAmount: netPayableTotal + discountAmt,
        discountAmount: discountAmt,
        entry: {
          type: LedgerEntryType.INVOICE,
          description: `Service charge - ${service.name} ${planTier} (₹${netPayableTotal.toLocaleString('en-IN')} incl. GST)`,
          invoiceId: taxInvoice._id.toString(),
          debit: netPayableTotal,
          credit: 0,
        },
      });

      // Ledger entry 2: Payment received (credit)
      await createOrUpdateLedger({
        registrationId: regId,
        studentId: studId,
        totalServiceAmount: netPayableTotal + discountAmt,
        discountAmount: discountAmt,
        entry: {
          type: LedgerEntryType.PAYMENT,
          description: `Payment received - Installment #1 (50%) incl. GST`,
          invoiceId: taxInvoice._id.toString(),
          paymentId: payment._id.toString(),
          debit: 0,
          credit: payment.amountInr,
        },
      });
    } else {
      // ===== Coaching / Education Planning: One-time full payment =====
      // Proforma invoice for full service plan amount
      await createProformaInvoice({
        registrationId: regId,
        studentId: studId,
        adminId,
        serviceName: service.name,
        serviceSlug,
        planTier,
        totalAmount: netPayableTotal, // Full service plan amount (GST-inclusive)
        discountAmount: 0,
      });

      // Tax invoice for full payment
      const taxInvoice = await createTaxInvoice({
        registrationId: regId,
        paymentId: payment._id.toString(),
        studentId: studId,
        adminId,
        serviceName: service.name,
        serviceSlug,
        planTier,
        amount: payment.amountInr, // GST-inclusive
        discountAmount: discountAmt,
        installmentNumber: 1,
        installmentPercentage: 100,
      });

      // Ledger entry 1: Full service charge
      await createOrUpdateLedger({
        registrationId: regId,
        studentId: studId,
        totalServiceAmount: netPayableTotal + discountAmt,
        discountAmount: discountAmt,
        entry: {
          type: LedgerEntryType.INVOICE,
          description: `Service charge - ${service.name} ${planTier} (₹${netPayableTotal.toLocaleString('en-IN')} incl. GST)`,
          invoiceId: taxInvoice._id.toString(),
          debit: netPayableTotal,
          credit: 0,
        },
      });

      // Ledger entry 2: Payment received
      await createOrUpdateLedger({
        registrationId: regId,
        studentId: studId,
        totalServiceAmount: netPayableTotal + discountAmt,
        discountAmount: discountAmt,
        entry: {
          type: LedgerEntryType.PAYMENT,
          description: `Payment received - Full payment incl. GST`,
          invoiceId: taxInvoice._id.toString(),
          paymentId: payment._id.toString(),
          debit: 0,
          credit: payment.amountInr,
        },
      });
    }

    // Notify super admin
    try {
      const superAdmin = await User.findOne({ role: USER_ROLE.SUPER_ADMIN });
      if (superAdmin) {
        const studentUser = await User.findById(student.userId);
        await sendServiceRegistrationEmailToSuperAdmin(
          superAdmin.email,
          [studentUser?.firstName, studentUser?.middleName, studentUser?.lastName].filter(Boolean).join(' ') || 'Unknown Student',
          studentUser?.email || 'Unknown Email',
          `${service.name} (${planTier})`
        );
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    return res.status(200).json({
      success: true,
      message: `Payment verified and registered for ${service.name} ${planTier}`,
      data: {
        payment,
        registration: populated,
      },
    });
  } catch (error: any) {
    console.error('Error verifying registration payment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Create Upgrade Order (Pay-First Upgrade Flow) =====
// Creates a Razorpay order for the upgrade difference amount without upgrading the registration yet.

export const createUpgradeOrder = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceSlug, newPlanTier } = req.body;
    const userId = req.user?.userId;
    const GST_RATE = 18;

    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!serviceSlug || !newPlanTier) {
      return res.status(400).json({ success: false, message: 'serviceSlug and newPlanTier are required' });
    }

    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const registration = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId: service._id,
    });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'No registration found for this service' });
    }
    if (registration.planTier === newPlanTier) {
      return res.status(400).json({ success: false, message: 'Already on this plan' });
    }

    const oldPlanTier = registration.planTier!;

    // Get pricing for both plans
    let newBasePrice = 0;
    let oldBasePrice = 0;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing?.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        newBasePrice = pricesObj[newPlanTier] || 0;
        oldBasePrice = pricesObj[oldPlanTier] || 0;
      }
    }
    if (newBasePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Pricing not available for new plan' });
    }
    if (oldBasePrice >= newBasePrice) {
      return res.status(400).json({ success: false, message: 'Can only upgrade to a higher plan' });
    }

    // Apply discount for new plan
    let newDiscountAmt = 0;
    const planDiscount = await StudentPlanDiscount.findOne({
      studentId: student._id, serviceSlug, planTier: newPlanTier, isActive: true,
    }).lean();
    if (planDiscount && planDiscount.calculatedAmount > 0) newDiscountAmt = planDiscount.calculatedAmount;

    const newNetBase = Math.max(0, newBasePrice - newDiscountAmt);
    const newGst = Math.round(newNetBase * GST_RATE / 100);
    const newNetPayable = newNetBase + newGst;

    // Old plan net payable — apply old plan's discount (same logic as registration) for accurate diff
    let oldDiscountAmt = 0;
    const oldPlanDiscount = await StudentPlanDiscount.findOne({
      studentId: student._id, serviceSlug, planTier: oldPlanTier, isActive: true,
    }).lean();
    if (oldPlanDiscount && oldPlanDiscount.calculatedAmount > 0) oldDiscountAmt = oldPlanDiscount.calculatedAmount;

    const oldNetBase = Math.max(0, oldBasePrice - oldDiscountAmt);
    const oldGst = Math.round(oldNetBase * GST_RATE / 100);
    const oldNetPayable = oldNetBase + oldGst;

    // Calculate upgrade difference
    let upgradeDifference: number;
    if (registration.paymentModel === 'installment' && registration.installmentPlan?.schedule?.length) {
      // Installment-based: use percentage paid approach
      const regularPaid = registration.installmentPlan.schedule.filter(
        (s) => s.status === 'paid' && (!s.label || !s.label.startsWith('Upgrade'))
      );
      const percentPaid = regularPaid.reduce((sum, s) => sum + s.percentage, 0);
      const alreadyPaid = registration.totalPaid || 0;
      const newPlanAtSamePercent = Math.round(newNetPayable * percentPaid / 100);
      upgradeDifference = Math.max(0, newPlanAtSamePercent - alreadyPaid);
    } else {
      // One-time payment: charge new plan cost minus already paid
      upgradeDifference = Math.max(0, newNetPayable - (registration.totalPaid || 0));
    }

    if (upgradeDifference <= 0) {
      return res.status(400).json({ success: false, message: 'No additional payment required for this upgrade' });
    }

    const amountInPaise = Math.round(upgradeDifference * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `upg_${student._id.toString().slice(-10)}_${Date.now().toString(36)}`,
      notes: {
        studentId: student._id.toString(),
        serviceSlug,
        oldPlanTier,
        newPlanTier,
        type: 'upgrade',
        upgradeDifference: String(upgradeDifference),
        newNetPayable: String(newNetPayable),
        oldNetPayable: String(oldNetPayable),
        newBasePrice: String(newBasePrice),
        newDiscountAmt: String(newDiscountAmt),
      },
    });

    const payment = await Payment.create({
      studentId: student._id,
      adminId: student.adminId,
      registrationId: registration._id,
      razorpayOrderId: order.id,
      amountInr: upgradeDifference,
      currency: 'INR',
      type: PaymentType.SERVICE,
      status: PaymentStatus.CREATED,
      description: `Upgrade payment - ${service.name} ${oldPlanTier} to ${newPlanTier}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Upgrade order created',
      data: {
        orderId: order.id,
        amount: amountInPaise,
        amountInr: upgradeDifference,
        currency: 'INR',
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID,
        upgradeDifference,
        newNetPayable,
        oldPlanTier,
        newPlanTier,
      },
    });
  } catch (error: any) {
    console.error('Error creating upgrade order:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Verify Upgrade Payment =====
// Verifies Razorpay payment, upgrades the registration, updates installment schedule, invoices, and ledger.

export const verifyUpgradePayment = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed - invalid signature' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (payment.status === PaymentStatus.CAPTURED) {
      return res.status(200).json({ success: true, message: 'Payment already verified', data: { payment } });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = PaymentStatus.CAPTURED;
    payment.paidAt = new Date();

    // Fetch order notes
    const orderDetails = await razorpay.orders.fetch(razorpay_order_id);
    const notes = orderDetails.notes as Record<string, string>;
    const studentId = notes.studentId;
    const serviceSlug = notes.serviceSlug;
    const oldPlanTier = notes.oldPlanTier;
    const newPlanTier = notes.newPlanTier;
    const upgradeDifference = Number(notes.upgradeDifference);
    const newNetPayable = Number(notes.newNetPayable);
    const oldNetPayable = Number(notes.oldNetPayable);
    const newBasePrice = Number(notes.newBasePrice);
    const newDiscountAmt = Number(notes.newDiscountAmt);

    if (!serviceSlug || !oldPlanTier || !newPlanTier || !studentId) {
      return res.status(400).json({ success: false, message: 'Invalid order metadata' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const registration = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId: service._id,
    });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    const adminId = student.adminId?.toString();
    const regId = registration._id.toString();
    const studId = (student._id as any).toString();

    // ===== 1. Upgrade registration =====
    registration.planTier = newPlanTier;
    registration.totalAmount = newBasePrice;
    registration.paymentAmount = newBasePrice;
    if (newDiscountAmt > 0) {
      registration.discountedAmount = newBasePrice - newDiscountAmt;
    } else {
      registration.discountedAmount = undefined;
    }
    registration.totalPaid = (registration.totalPaid || 0) + payment.amountInr;

    // ===== 2. Update installment schedule (study-abroad only) =====
    if (registration.paymentModel === 'installment' && registration.installmentPlan?.schedule?.length) {
      const oldSchedule = registration.installmentPlan.schedule;
      const newScheduleData = buildInstallmentSchedule(newNetPayable);

      // Count existing upgrade entries (for numbering)
      const existingUpgradeEntries = oldSchedule.filter(
        (s) => s.label && s.label.startsWith('Upgrade')
      );

      // Rebuild new schedule from new plan amounts, preserving paid statuses AND original amounts of regular installments
      for (const oldInst of oldSchedule) {
        if (oldInst.status === 'paid' && (!oldInst.label || !oldInst.label.startsWith('Upgrade'))) {
          const newInst = newScheduleData.schedule.find((s) => s.number === oldInst.number);
          if (newInst) {
            newInst.status = 'paid';
            newInst.amount = oldInst.amount; // Keep original paid amount, not new plan's amount
            newInst.paidAt = oldInst.paidAt;
            newInst.razorpayOrderId = oldInst.razorpayOrderId;
          }
        }
      }

      // New upgrade entry
      const upgradeEntry = {
        number: 100 + existingUpgradeEntries.length + 1, // 101, 102, ...
        percentage: 0,
        amount: upgradeDifference,
        status: 'paid' as string,
        label: `Upgrade to ${newPlanTier}`,
        paidAt: new Date(),
        razorpayOrderId: razorpay_order_id,
      };

      // Mark next unpaid regular installment as 'due'
      const remaining = newScheduleData.schedule.filter((s) => s.status !== 'paid');
      if (remaining.length > 0) remaining[0].status = 'due';

      const paidRegular = newScheduleData.schedule.filter((s) => s.status === 'paid');
      const allUpgradeEntries = [...existingUpgradeEntries, upgradeEntry];
      const pendingRegular = newScheduleData.schedule.filter((s) => s.status !== 'paid');
      const fullSchedule = [...paidRegular, ...allUpgradeEntries, ...pendingRegular];

      const totalCompleted = paidRegular.length + allUpgradeEntries.length;
      registration.installmentPlan = {
        totalInstallments: newScheduleData.totalInstallments + allUpgradeEntries.length,
        completedInstallments: totalCompleted,
        schedule: fullSchedule,
      };
      registration.paymentComplete = pendingRegular.length === 0;
      (registration as any).paymentStatus = registration.paymentComplete ? 'paid' : 'partial';
    } else {
      // One-time payment: upgrade brings total paid to full new plan cost
      registration.paymentComplete = true;
      (registration as any).paymentStatus = 'paid';
    }

    await registration.save();

    // Link payment to registration
    payment.registrationId = registration._id as any;
    await payment.save();

    // ===== 3. Tax invoice for upgrade payment =====
    const taxInvoice = await createTaxInvoice({
      registrationId: regId,
      paymentId: payment._id.toString(),
      studentId: studId,
      adminId,
      serviceName: service.name,
      serviceSlug,
      planTier: newPlanTier,
      amount: payment.amountInr,
      discountAmount: 0,
    });

    // ===== 4. Proforma invoice for upgrade plan difference =====
    const planDifference = newNetPayable - oldNetPayable;
    if (planDifference > 0) {
      await createProformaInvoice({
        registrationId: regId,
        studentId: studId,
        adminId,
        serviceName: service.name,
        serviceSlug,
        planTier: newPlanTier,
        totalAmount: planDifference, // Difference in total plan amounts (GST-inclusive)
        discountAmount: 0,
      });
    }

    // ===== 5. Ledger: debit for upgrade charge, credit for payment =====
    const upgradeCharge = newNetPayable - oldNetPayable;

    await createOrUpdateLedger({
      registrationId: regId,
      studentId: studId,
      totalServiceAmount: newNetPayable,
      discountAmount: 0,
      entry: {
        type: LedgerEntryType.INVOICE,
        description: `Upgrade charge - ${oldPlanTier} to ${newPlanTier} (additional ₹${upgradeCharge.toLocaleString('en-IN')} incl. GST)`,
        invoiceId: taxInvoice._id.toString(),
        debit: upgradeCharge,
        credit: 0,
      },
    });

    await createOrUpdateLedger({
      registrationId: regId,
      studentId: studId,
      totalServiceAmount: newNetPayable,
      discountAmount: 0,
      entry: {
        type: LedgerEntryType.PAYMENT,
        description: `Upgrade payment received - ${oldPlanTier} to ${newPlanTier} (₹${payment.amountInr.toLocaleString('en-IN')} incl. GST)`,
        invoiceId: taxInvoice._id.toString(),
        paymentId: payment._id.toString(),
        debit: 0,
        credit: payment.amountInr,
      },
    });

    // Update ledger totals to reflect new plan (amounts and discount)
    const ledger = await Ledger.findOne({ registrationId: registration._id });
    if (ledger) {
      ledger.totalServiceAmount = newNetPayable + newDiscountAmt;
      ledger.totalDiscount = newDiscountAmt;
      ledger.netPayable = newNetPayable;
      ledger.balance = ledger.netPayable - ledger.totalPaid;
      await ledger.save();
    }

    // ===== 6. Notify super admin =====
    try {
      const superAdmin = await User.findOne({ role: USER_ROLE.SUPER_ADMIN });
      if (superAdmin) {
        const studentUser = await User.findById(student.userId);
        await sendServiceRegistrationEmailToSuperAdmin(
          superAdmin.email,
          [studentUser?.firstName, studentUser?.middleName, studentUser?.lastName].filter(Boolean).join(' ') || 'Unknown Student',
          studentUser?.email || 'Unknown Email',
          `${service.name} - Upgraded to ${newPlanTier}`
        );
      }
    } catch (emailError) {
      console.error('Failed to send upgrade notification email:', emailError);
    }

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    return res.status(200).json({
      success: true,
      message: `Successfully upgraded from ${oldPlanTier} to ${newPlanTier}`,
      data: {
        payment,
        registration: populated,
        upgrade: {
          oldPlan: oldPlanTier,
          newPlan: newPlanTier,
          upgradeDifference,
          newNetPayable,
        },
      },
    });
  } catch (error: any) {
    console.error('Error verifying upgrade payment:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
