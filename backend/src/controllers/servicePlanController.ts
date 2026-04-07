import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ServicePricing from '../models/ServicePricing';
import SuperAdminServicePricing from '../models/SuperAdminServicePricing';
import Admin from '../models/Admin';
import Student from '../models/Student';
import Service from '../models/Service';
import StudentServiceRegistration, { ServiceRegistrationStatus } from '../models/StudentServiceRegistration';
import User from '../models/User';
import Counselor from '../models/Counselor';
import { USER_ROLE } from '../types/roles';
import { sendServiceRegistrationEmailToSuperAdmin } from '../utils/email';
import StudentPlanDiscount from '../models/StudentPlanDiscount';
import { buildInstallmentSchedule, createProformaInvoice } from '../services/paymentService';

// Get pricing for the student's admin for a specific service
export const getPricingForStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    let adminId: any;
    if (userRole === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId }).lean();
      if (!counselor || !counselor.adminId) { res.status(404).json({ success: false, message: 'Counselor or admin not found' }); return; }
      // counselor.adminId is the admin's User._id, but ServicePricing uses Admin._id
      const admin = await Admin.findOne({ userId: counselor.adminId }).lean();
      if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }
      adminId = admin._id;
    } else {
      const student = await Student.findOne({ userId }).lean();
      if (!student || !student.adminId) { res.status(404).json({ success: false, message: 'Student or admin not found' }); return; }
      adminId = student.adminId;
    }

    const pricing = await ServicePricing.findOne({ adminId, serviceSlug }).lean();
    if (!pricing) {
      res.json({ success: true, data: { pricing: null, message: 'Pricing not set by your admin yet' } });
      return;
    }

    // Fetch student-specific discounts for this service
    let discountMap: Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null = null;
    if (userRole === USER_ROLE.STUDENT) {
      const student = await Student.findOne({ userId }).lean();
      if (student) {
        const discounts = await StudentPlanDiscount.find({
          studentId: student._id,
          serviceSlug,
          isActive: true,
        }).lean();
        if (discounts.length > 0) {
          discountMap = {};
          for (const d of discounts) {
            discountMap[d.planTier] = {
              type: d.type,
              value: d.value,
              calculatedAmount: d.calculatedAmount,
              reason: d.reason,
            };
          }
        }
      }
    }

    res.json({
      success: true,
      data: { pricing: pricing.prices, discounts: discountMap },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch pricing' });
  }
};

// Register student for a service with chosen plan tier
export const registerServicePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { planTier } = req.body;
    const classTiming = req.body.classTiming || undefined;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (!planTier || typeof planTier !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid plan tier.' });
      return;
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }
    if (!service.isActive) {
      res.status(400).json({ success: false, message: 'This service is not currently available' });
      return;
    }

    // Check pricing - if service has pricing, registration must go through pay-first flow
    let paymentAmount: number | undefined;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        paymentAmount = pricesObj[planTier];
      }
    }

    // Paid services must use /payments/create-registration-order flow
    if (paymentAmount && paymentAmount > 0) {
      res.status(400).json({
        success: false,
        message: 'This service requires payment before registration. Use the payment flow.',
        requiresPayment: true,
      });
      return;
    }

    const isCoaching = serviceSlug === 'coaching-classes';

    if (isCoaching) {
      const existingClass = await StudentServiceRegistration.findOne({
        studentId: student._id, serviceId: service._id, planTier,
      });
      if (existingClass) {
        res.status(400).json({ success: false, message: `You are already registered for ${planTier}` });
        return;
      }
    } else {
      const existing = await StudentServiceRegistration.findOne({
        studentId: student._id, serviceId: service._id,
      });
      if (existing) {
        res.status(400).json({ success: false, message: `You are already registered for ${service.name}` });
        return;
      }
    }

    // Free service registration (no payment required)
    const registration = await StudentServiceRegistration.create({
      studentId: student._id,
      serviceId: service._id,
      planTier,
      ...(isCoaching && classTiming ? { classTiming } : {}),
      status: ServiceRegistrationStatus.REGISTERED,
      paymentAmount: 0,
      paymentStatus: 'paid',
      paymentComplete: true,
    });

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    // Notify super admin
    try {
      const superAdmin = await User.findOne({ role: USER_ROLE.SUPER_ADMIN });
      if (superAdmin) {
        const studentUser = await User.findById(userId);
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

    res.status(201).json({
      success: true,
      message: `Successfully registered for ${service.name} ${planTier} plan`,
      data: { registration: populated },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to register' });
  }
};

// ============ Admin Pricing ============

// Get admin's pricing for a service
export const getAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    const admin = await Admin.findOne({ userId }).lean();
    if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }

    const pricing = await ServicePricing.findOne({ adminId: admin._id, serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch pricing' });
  }
};

// Set/update admin's pricing for a service
export const setAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { prices } = req.body;

    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
      res.status(400).json({ success: false, message: 'Prices object is required' });
      return;
    }
    for (const [key, val] of Object.entries(prices)) {
      if (typeof val !== 'number' || val < 0) {
        res.status(400).json({ success: false, message: `Invalid price for ${key}. Must be a non-negative number.` });
        return;
      }
    }

    const admin = await Admin.findOne({ userId }).lean();
    if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }

    const pricing = await ServicePricing.findOneAndUpdate(
      { adminId: admin._id, serviceSlug },
      { adminId: admin._id, serviceSlug, prices },
      { upsert: true, new: true, runValidators: true }
    );

    const savedPrices = pricing.prices instanceof Map ? Object.fromEntries(pricing.prices) : pricing.prices;
    res.json({
      success: true,
      message: 'Pricing updated successfully',
      data: { pricing: savedPrices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update pricing' });
  }
};

// ============ Super Admin Base Pricing ============

// Get super admin's base pricing for a service
export const getSuperAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const pricing = await SuperAdminServicePricing.findOne({ serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch super admin pricing' });
  }
};

// Set/update super admin's base pricing for a service
export const setSuperAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const { prices } = req.body;

    if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
      res.status(400).json({ success: false, message: 'Prices object is required' });
      return;
    }
    for (const [key, val] of Object.entries(prices)) {
      if (typeof val !== 'number' || val < 0) {
        res.status(400).json({ success: false, message: `Invalid price for ${key}. Must be a non-negative number.` });
        return;
      }
    }

    const pricing = await SuperAdminServicePricing.findOneAndUpdate(
      { serviceSlug },
      { serviceSlug, prices },
      { upsert: true, new: true, runValidators: true }
    );

    const savedPrices = pricing.prices instanceof Map ? Object.fromEntries(pricing.prices) : pricing.prices;
    res.json({
      success: true,
      message: 'Base pricing updated successfully',
      data: { pricing: savedPrices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update base pricing' });
  }
};

// Get base pricing for admin to see (admin views super admin's base price)
export const getBasePricingForAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const pricing = await SuperAdminServicePricing.findOne({ serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        basePricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch base pricing' });
  }
};

// Get admin's selling price for any authenticated role (for viewing plans)
// Note: adminId param may be either the Admin model _id or the User._id of the admin
export const getAdminPricingByAdminId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug, adminId } = req.params;

    // Try directly as Admin._id first (used by student detail pages)
    let pricing = await ServicePricing.findOne({ adminId, serviceSlug }).lean();

    // If not found, adminId might be a User._id (used by super admin pages)
    if (!pricing) {
      const admin = await Admin.findOne({ userId: adminId }).lean();
      if (admin) {
        pricing = await ServicePricing.findOne({ adminId: admin._id, serviceSlug }).lean();
      }
    }

    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin pricing' });
  }
};

// ============ Plan Upgrade ============

// Student upgrades their plan tier for a service
export const upgradePlanTier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { newPlanTier } = req.body;

    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    if (!newPlanTier || typeof newPlanTier !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid plan tier.' }); return;
    }

    const student = await Student.findOne({ userId });
    if (!student) { res.status(404).json({ success: false, message: 'Student record not found' }); return; }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) { res.status(404).json({ success: false, message: 'Service not found' }); return; }

    const registration = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId: service._id,
    });
    if (!registration) {
      res.status(404).json({ success: false, message: 'No existing registration found for this service' }); return;
    }
    if (registration.planTier === newPlanTier) {
      res.status(400).json({ success: false, message: 'You are already on this plan' }); return;
    }

    const oldPlanTier = registration.planTier;
    const GST_RATE = 18;

    // Get new plan pricing
    let newBasePrice = 0;
    let oldBasePrice = registration.totalAmount || registration.paymentAmount || 0;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        newBasePrice = pricesObj[newPlanTier] || 0;
        // Re-read old price from pricing in case totalAmount was discounted
        if (oldPlanTier && pricesObj[oldPlanTier]) {
          oldBasePrice = pricesObj[oldPlanTier];
        }
      }
    }
    if (newBasePrice <= 0) {
      res.status(400).json({ success: false, message: 'Pricing not available for new plan' }); return;
    }
    if (newBasePrice <= oldBasePrice) {
      res.status(400).json({ success: false, message: 'Can only upgrade to a higher plan' }); return;
    }

    // Apply discount for new plan tier if exists
    let newDiscountAmt = 0;
    const newPlanDiscount = await StudentPlanDiscount.findOne({
      studentId: student._id, serviceSlug, planTier: newPlanTier, isActive: true,
    }).lean();
    if (newPlanDiscount && newPlanDiscount.calculatedAmount > 0) {
      newDiscountAmt = newPlanDiscount.calculatedAmount;
    }
    const newNetBase = Math.max(0, newBasePrice - newDiscountAmt);
    const newGst = Math.round(newNetBase * GST_RATE / 100);
    const newNetPayable = newNetBase + newGst;

    // Recalculate old plan's net payable for comparison
    const oldDiscountAmt = (registration.totalAmount || 0) - (registration.discountedAmount ?? registration.totalAmount ?? 0);
    const oldNetBase = Math.max(0, oldBasePrice - Math.max(0, oldDiscountAmt));
    const oldGst = Math.round(oldNetBase * GST_RATE / 100);
    const oldNetPayable = oldNetBase + oldGst;

    // Determine percentage already paid from installment schedule
    let percentPaid = 0;
    if (registration.installmentPlan && registration.installmentPlan.schedule) {
      const paidInstallments = registration.installmentPlan.schedule.filter(s => s.status === 'paid');
      percentPaid = paidInstallments.reduce((sum, s) => sum + s.percentage, 0);
    } else if (registration.paymentComplete) {
      percentPaid = 100;
    } else if (registration.totalPaid && oldNetPayable > 0) {
      percentPaid = Math.round((registration.totalPaid / oldNetPayable) * 100);
    }

    // Calculate difference: (percentPaid% of new plan) - (what was already paid)
    const alreadyPaid = registration.totalPaid || 0;
    const newPlanAtSamePercent = Math.round(newNetPayable * percentPaid / 100);
    const upgradeDifference = Math.max(0, newPlanAtSamePercent - alreadyPaid);

    // Remaining percentage for third installment (20%)
    const remainingPercent = 100 - percentPaid;
    const remainingAmount = Math.round(newNetPayable * remainingPercent / 100);

    // Update registration
    registration.planTier = newPlanTier;
    registration.totalAmount = newBasePrice;
    registration.paymentAmount = newBasePrice;
    if (newDiscountAmt > 0) {
      registration.discountedAmount = newNetBase;
    } else {
      registration.discountedAmount = undefined;
    }

    // Rebuild installment schedule for new plan
    if (registration.paymentModel === 'installment' && registration.installmentPlan) {
      const oldSchedule = registration.installmentPlan.schedule;
      const newSchedule = buildInstallmentSchedule(newNetPayable);

      // Preserve paid statuses from old schedule
      for (const oldInst of oldSchedule) {
        if (oldInst.status === 'paid') {
          const newInst = newSchedule.schedule.find(s => s.number === oldInst.number);
          if (newInst) {
            newInst.status = 'paid';
            newInst.paidAt = oldInst.paidAt;
            newInst.razorpayOrderId = oldInst.razorpayOrderId;
          }
        }
      }

      // Mark next unpaid as due
      const nextUnpaid = newSchedule.schedule.find(s => s.status !== 'paid');
      if (nextUnpaid) {
        nextUnpaid.status = 'due';
      }

      newSchedule.completedInstallments = newSchedule.schedule.filter(s => s.status === 'paid').length;
      registration.installmentPlan = newSchedule;

      // Check if all paid (shouldn't happen on upgrade but just in case)
      registration.paymentComplete = newSchedule.completedInstallments >= newSchedule.totalInstallments;
      registration.paymentStatus = registration.paymentComplete ? 'paid' : 'partial';
    }

    await registration.save();

    // Create proforma invoice for the difference amount only
    if (upgradeDifference > 0) {
      await createProformaInvoice({
        registrationId: registration._id.toString(),
        studentId: (student._id as any).toString(),
        adminId: student.adminId?.toString(),
        serviceName: service.name,
        serviceSlug,
        planTier: newPlanTier,
        totalAmount: upgradeDifference, // only the difference
        discountAmount: 0,
      });
    }

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    res.json({
      success: true,
      message: `Successfully upgraded from ${oldPlanTier} to ${newPlanTier}`,
      data: {
        registration: populated,
        upgrade: {
          oldPlan: oldPlanTier,
          newPlan: newPlanTier,
          percentPaid,
          alreadyPaid,
          upgradeDifference,
          remainingAmount,
          newNetPayable,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to upgrade plan' });
  }
};

// Get a student's current plan tiers for all services (for admin/staff viewing)
export const getStudentPlanTiers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const [registrations, student] = await Promise.all([
      StudentServiceRegistration.find({ studentId })
        .populate('serviceId', 'name slug')
        .select('planTier serviceId classTiming')
        .lean(),
      Student.findById(studentId).populate('userId', 'firstName middleName lastName').lean(),
    ]);

    const planTiers: Record<string, string> = {};
    const coachingPlanTiers: Record<string, { batchDate?: string; timeFrom?: string; timeTo?: string } | null> = {};
    for (const reg of registrations) {
      const svc = reg.serviceId as any;
      if (svc?.slug && reg.planTier) {
        if (svc.slug === 'coaching-classes') {
          coachingPlanTiers[reg.planTier] = (reg as any).classTiming || null;
        } else {
          planTiers[svc.slug] = reg.planTier;
        }
      }
    }

    const u = student?.userId as any;
    const studentName = u ? [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') : '';
    const adminId = student?.adminId?.toString() || '';

    res.json({ success: true, data: { planTiers, coachingPlanTiers, studentName, adminId } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch student plan tiers' });
  }
};
