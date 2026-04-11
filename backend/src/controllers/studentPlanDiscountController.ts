import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import StudentPlanDiscount, { PlanDiscountType } from '../models/StudentPlanDiscount';
import ServicePricing from '../models/ServicePricing';
import Admin from '../models/Admin';
import Advisory from '../models/Advisory';

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
      ownerFields = { adminId: admin._id };
      pricingFilter = { adminId: admin._id, serviceSlug };
    } else {
      const advisory = await Advisory.findOne({ userId: req.user!.userId });
      if (!advisory) {
        return res.status(404).json({ success: false, message: 'Admin/Advisory not found' });
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
