import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import StudentPlanDiscount, { PlanDiscountType } from '../models/StudentPlanDiscount';
import ServicePricing from '../models/ServicePricing';
import Admin from '../models/Admin';
import Advisory from '../models/Advisory';
import Student from '../models/Student';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Service from '../models/Service';

// ===== Set/Update Student Plan Discount (Admin or Advisory) =====

export const setStudentPlanDiscount = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, serviceSlug, planTier, type, value, reason } = req.body;

    if (!studentId || !serviceSlug || !planTier || !type || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'studentId, serviceSlug, planTier, type, and value are required',
      });
    }

    if (!Object.values(PlanDiscountType).includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid discount type' });
    }

    if (value < 0) {
      return res.status(400).json({ success: false, message: 'Discount value cannot be negative' });
    }

    if (type === PlanDiscountType.PERCENTAGE && value > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100' });
    }

    // Find admin or advisory
    let ownerFields: { adminId?: any; advisoryId?: any } = {};
    let pricingFilter: any;
    const admin = await Admin.findOne({ userId: req.user!.userId });
    if (admin) {
      // Guard: admin cannot set discounts for services registered under an advisory
      const studentDoc = await Student.findById(studentId).lean();
      if (studentDoc?.advisoryId) {
        const service = await Service.findOne({ slug: serviceSlug }).lean();
        if (service) {
          const advisoryRegistration = await StudentServiceRegistration.findOne({
            studentId,
            serviceId: service._id,
            registeredViaAdvisoryId: { $exists: true, $ne: null },
          }).lean();
          if (advisoryRegistration) {
            return res.status(403).json({
              success: false,
              message: 'This service was registered under an advisor. Discount for this service is managed by the advisor.',
            });
          }
        }
      }
      ownerFields = { adminId: admin._id };
      pricingFilter = { adminId: admin._id, serviceSlug };
    } else {
      const advisory = await Advisory.findOne({ userId: req.user!.userId });
      if (!advisory) {
        return res.status(404).json({ success: false, message: 'Admin/Advisory not found' });
      }

      // Guard: if student has been transferred (has adminId), advisory can only set discounts
      // for services the student registered under this advisory
      const studentDoc = await Student.findById(studentId).lean();
      if (studentDoc?.adminId) {
        // Find service by slug to get serviceId
        const service = await Service.findOne({ slug: serviceSlug }).lean();
        if (!service) {
          return res.status(400).json({ success: false, message: 'Service not found' });
        }
        const hasAdvisoryRegistration = await StudentServiceRegistration.findOne({
          studentId,
          serviceId: service._id,
          registeredViaAdvisoryId: advisory._id,
        }).lean();
        if (!hasAdvisoryRegistration) {
          return res.status(403).json({
            success: false,
            message: 'Student has been transferred. You can only manage discounts for services registered under your advisory.',
          });
        }
      }

      ownerFields = { advisoryId: advisory._id };
      pricingFilter = { advisoryId: advisory._id, serviceSlug };
    }

    // Get pricing for calculation
    const pricing = await ServicePricing.findOne(pricingFilter).lean();
    if (!pricing || !pricing.prices) {
      return res.status(400).json({ success: false, message: 'Pricing not set for this service' });
    }

    const pricesObj = pricing.prices as unknown as Record<string, number>;
    const basePrice = pricesObj[planTier];
    if (basePrice === undefined || basePrice <= 0) {
      return res.status(400).json({ success: false, message: `Price not set for plan tier: ${planTier}` });
    }

    // Calculate discount amount
    let calculatedAmount: number;
    if (type === PlanDiscountType.PERCENTAGE) {
      calculatedAmount = Math.round(basePrice * value / 100);
    } else {
      calculatedAmount = value;
    }

    // Ensure discount doesn't exceed base price
    if (calculatedAmount > basePrice) {
      calculatedAmount = basePrice;
    }

    // Deactivate any existing discount for this student+service+plan
    await StudentPlanDiscount.updateMany(
      { studentId, serviceSlug, planTier, isActive: true },
      { isActive: false }
    );

    // Create new discount
    const discount = await StudentPlanDiscount.create({
      studentId,
      ...ownerFields,
      serviceSlug,
      planTier,
      type,
      value,
      calculatedAmount,
      reason,
      isActive: true,
      createdBy: req.user!.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Discount set successfully',
      data: {
        discount,
        originalPrice: basePrice,
        discountedPrice: basePrice - calculatedAmount,
      },
    });
  } catch (error: any) {
    console.error('Error setting student plan discount:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Get Student Plan Discounts =====

export const getStudentPlanDiscounts = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const { serviceSlug } = req.query;

    const query: any = { studentId, isActive: true };
    if (serviceSlug) query.serviceSlug = serviceSlug;

    const discounts = await StudentPlanDiscount.find(query).lean();

    // Build a map: { [serviceSlug]: { [planTier]: { type, value, calculatedAmount, discountId } } }
    const discountMap: Record<string, Record<string, {
      type: string;
      value: number;
      calculatedAmount: number;
      discountId: string;
      reason?: string;
    }>> = {};

    for (const d of discounts) {
      if (!discountMap[d.serviceSlug]) discountMap[d.serviceSlug] = {};
      discountMap[d.serviceSlug][d.planTier] = {
        type: d.type,
        value: d.value,
        calculatedAmount: d.calculatedAmount,
        discountId: (d._id as any).toString(),
        reason: d.reason,
      };
    }

    return res.status(200).json({
      success: true,
      data: { discounts: discountMap },
    });
  } catch (error: any) {
    console.error('Error fetching student plan discounts:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Remove Student Plan Discount =====

export const removeStudentPlanDiscount = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { discountId } = req.params;

    const discount = await StudentPlanDiscount.findById(discountId);
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found' });
    }

    if (!discount.isActive) {
      return res.status(400).json({ success: false, message: 'Discount is already inactive' });
    }

    // Authorization: advisory can only remove discounts they set
    const advisory = await Advisory.findOne({ userId: req.user!.userId });
    if (advisory) {
      // Caller is an advisory — only allow removing own discounts
      if (!discount.advisoryId || discount.advisoryId.toString() !== advisory._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only remove discounts set by your advisory.',
        });
      }
    } else {
      // Caller is admin
      const admin = await Admin.findOne({ userId: req.user!.userId });
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin/Advisory not found' });
      }
      // Block admin from removing advisory-set discounts for advisory-registered services
      if (discount.advisoryId) {
        const service = await Service.findOne({ slug: discount.serviceSlug }).lean();
        if (service) {
          const advisoryRegistration = await StudentServiceRegistration.findOne({
            studentId: discount.studentId,
            serviceId: service._id,
            registeredViaAdvisoryId: discount.advisoryId,
          }).lean();
          if (advisoryRegistration) {
            return res.status(403).json({
              success: false,
              message: 'This discount was set by an advisor for an advisor-registered service and cannot be modified.',
            });
          }
        }
      }
    }

    discount.isActive = false;
    await discount.save();

    return res.status(200).json({
      success: true,
      message: 'Discount removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing student plan discount:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
