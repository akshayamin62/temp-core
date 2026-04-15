import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ServicePricing from '../models/ServicePricing';
import SuperAdminServicePricing from '../models/SuperAdminServicePricing';
import Admin from '../models/Admin';
import Advisory from '../models/Advisory';
import Student from '../models/Student';
import Service from '../models/Service';
import StudentServiceRegistration, { ServiceRegistrationStatus } from '../models/StudentServiceRegistration';
import User from '../models/User';
import Counselor from '../models/Counselor';
import { USER_ROLE } from '../types/roles';
import { sendServiceRegistrationEmailToSuperAdmin } from '../utils/email';
import StudentPlanDiscount from '../models/StudentPlanDiscount';
import Parent from '../models/Parent';
import Referrer from '../models/Referrer';
import { buildInstallmentSchedule, createProformaInvoice } from '../services/paymentService';

// Get pricing for the student's admin for a specific service
export const getPricingForStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    let adminId: any;
    let advisoryId: any;
    if (userRole === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId }).lean();
      if (!counselor || !counselor.adminId) { res.status(404).json({ success: false, message: 'Counselor or admin not found' }); return; }
      // counselor.adminId is the admin's User._id, but ServicePricing uses Admin._id
      const admin = await Admin.findOne({ userId: counselor.adminId }).lean();
      if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }
      adminId = admin._id;
    } else {
      const student = await Student.findOne({ userId }).lean();
      if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
      
      if (student.adminId && student.advisoryId) {
        // Transferred student: check if this service was registered via advisory
        const service = await Service.findOne({ slug: serviceSlug }).lean();
        const advisoryReg = service ? await StudentServiceRegistration.findOne({
          studentId: student._id,
          serviceId: service._id,
          registeredViaAdvisoryId: { $exists: true, $ne: null },
        }).lean() : null;

        if (advisoryReg) {
          // Service was registered under advisory → use advisory pricing
          advisoryId = student.advisoryId;
        } else {
          // Service registered under admin (or not yet registered) → use admin pricing
          adminId = student.adminId;
        }
      } else if (student.adminId) {
        adminId = student.adminId;
      } else if (student.advisoryId) {
        // Student belongs to advisory (pre-transfer)
        advisoryId = student.advisoryId;
        const advisory = await Advisory.findById(advisoryId).lean();
        if (!advisory) { res.status(404).json({ success: false, message: 'Advisory not found' }); return; }
        // Check if this service is in advisory's allowed services
        if (!advisory.allowedServices.includes(serviceSlug)) {
          res.json({ success: true, data: { pricing: null, message: 'This service is not available through your advisory. Contact your advisory for more options.' } });
          return;
        }
      } else {
        res.status(404).json({ success: false, message: 'Student is not linked to any admin or advisory' });
        return;
      }
    }

    const pricingQuery = adminId
      ? { adminId, serviceSlug }
      : { advisoryId, serviceSlug };
    const pricing = await ServicePricing.findOne(pricingQuery).lean();
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

    // Check advisory allowedServices
    if (student.advisoryId) {
      const advisory = await Advisory.findById(student.advisoryId);
      if (advisory && !advisory.allowedServices.includes(serviceSlug)) {
        res.status(403).json({
          success: false,
          message: 'This service is not available through your advisory. Please contact your advisory for more information.',
        });
        return;
      }
    }

    // Check pricing - if service has pricing, registration must go through pay-first flow
    let paymentAmount: number | undefined;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        paymentAmount = pricesObj[planTier];
      }
    } else if (student.advisoryId) {
      const pricing = await ServicePricing.findOne({ advisoryId: student.advisoryId, serviceSlug }).lean();
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
      ...(student.adminId ? { registeredViaAdminId: student.adminId } : {}),
      ...(student.advisoryId && !student.adminId ? { registeredViaAdvisoryId: student.advisoryId } : {}),
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

    let isAdvisory = false;
    let ownerDoc = await Admin.findOne({ userId }).lean();
    if (!ownerDoc) {
      ownerDoc = await Advisory.findOne({ userId }).lean();
      isAdvisory = true;
    }
    if (!ownerDoc) { res.status(404).json({ success: false, message: 'Admin/Advisory not found' }); return; }

    const pricingFilter = isAdvisory
      ? { advisoryId: ownerDoc._id, serviceSlug }
      : { adminId: ownerDoc._id, serviceSlug };
    const pricing = await ServicePricing.findOne(pricingFilter).lean();
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

    let isAdvisory = false;
    let ownerDoc = await Admin.findOne({ userId }).lean();
    if (!ownerDoc) {
      ownerDoc = await Advisory.findOne({ userId }).lean();
      isAdvisory = true;
    }
    if (!ownerDoc) { res.status(404).json({ success: false, message: 'Admin/Advisory not found' }); return; }

    const filterKey = isAdvisory ? 'advisoryId' : 'adminId';
    const pricing = await ServicePricing.findOneAndUpdate(
      { [filterKey]: ownerDoc._id, serviceSlug },
      { [filterKey]: ownerDoc._id, serviceSlug, prices },
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

    // If still not found, try as Advisory._id or Advisory User._id
    if (!pricing) {
      pricing = await ServicePricing.findOne({ advisoryId: adminId, serviceSlug }).lean();
      if (!pricing) {
        const advisory = await Advisory.findOne({ userId: adminId }).lean();
        if (advisory) {
          pricing = await ServicePricing.findOne({ advisoryId: advisory._id, serviceSlug }).lean();
        }
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
    const pricingQuery = student.adminId
      ? { adminId: student.adminId, serviceSlug }
      : student.advisoryId
        ? { advisoryId: student.advisoryId, serviceSlug }
        : null;
    if (pricingQuery) {
      const pricing = await ServicePricing.findOne(pricingQuery).lean();
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
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    const student = await Student.findById(studentId).populate('userId', 'firstName middleName lastName').lean();
    if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

    // Access control: verify the requesting user is connected to this student
    const isAllowed = await (async () => {
      if (userRole === USER_ROLE.SUPER_ADMIN || userRole === USER_ROLE.OPS) return true;
      if (userRole === USER_ROLE.STUDENT) return student.userId?._id?.toString() === userId;
      if (userRole === USER_ROLE.ADMIN) {
        const admin = await Admin.findOne({ userId }).lean();
        return admin && student.adminId?.toString() === admin._id.toString();
      }
      if (userRole === USER_ROLE.ADVISORY) {
        const advisory = await Advisory.findOne({ userId }).lean();
        return advisory && student.advisoryId?.toString() === advisory._id.toString();
      }
      if (userRole === USER_ROLE.COUNSELOR) {
        const counselor = await Counselor.findOne({ userId }).lean();
        return counselor && student.counselorId?.toString() === counselor._id.toString();
      }
      if (userRole === USER_ROLE.PARENT) {
        const parent = await Parent.findOne({ userId }).lean();
        return parent && parent.studentIds?.some((sid: any) => sid.toString() === studentId);
      }
      if (userRole === USER_ROLE.REFERRER) {
        const referrer = await Referrer.findOne({ userId }).lean();
        return referrer && student.referrerId?.toString() === referrer._id.toString();
      }
      // IVY_EXPERT, EDUPLAN_COACH — allowed (assigned through separate workflows)
      if (userRole === USER_ROLE.IVY_EXPERT || userRole === USER_ROLE.EDUPLAN_COACH) return true;
      return false;
    })();

    if (!isAllowed) {
      res.status(403).json({ success: false, message: 'You do not have access to this student' });
      return;
    }

    const registrations = await StudentServiceRegistration.find({ studentId })
      .populate('serviceId', 'name slug')
      .select('planTier serviceId classTiming registeredViaAdvisoryId')
      .lean();

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
    const advisoryId = student?.advisoryId?.toString() || '';

    // Build set of service slugs that were registered under the advisory (for discount control)
    const advisoryOwnedServiceSlugs: string[] = [];
    if (advisoryId) {
      for (const reg of registrations) {
        const svc = reg.serviceId as any;
        if (svc?.slug && (reg as any).registeredViaAdvisoryId) {
          if (!advisoryOwnedServiceSlugs.includes(svc.slug)) {
            advisoryOwnedServiceSlugs.push(svc.slug);
          }
        }
      }
    }

    res.json({ success: true, data: { planTiers, coachingPlanTiers, studentName, adminId, advisoryId, advisoryOwnedServiceSlugs } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch student plan tiers' });
  }
};
