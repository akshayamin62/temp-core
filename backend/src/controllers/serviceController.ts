import { Request, Response } from "express";
import Service from "../models/Service";
import Student from "../models/Student";
import User from "../models/User";
import ServicePricing from "../models/ServicePricing";
import StudentPlanDiscount from "../models/StudentPlanDiscount";
import StudentServiceRegistration, {
  ServiceRegistrationStatus,
} from "../models/StudentServiceRegistration";
import { AuthRequest } from "../types/auth";
import { USER_ROLE } from "../types/roles";
import { sendServiceRegistrationEmailToSuperAdmin } from "../utils/email";
import { getServiceFormStructure } from "../config/formConfig";

// Get all active services
export const getAllServices = async (_req: Request, res: Response) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: { services },
    });
  } catch (error: any) {
    console.error("Get services error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

// Get student's registered services
export const getMyServices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    const registrations = await StudentServiceRegistration.find({
      studentId: student._id,
    })
      .populate("serviceId")
      .sort({ registeredAt: -1 });

    // Backfill missing payment fields for older registrations so payment UI stays accurate.
    if (registrations.length > 0) {
      const pricingMapByServiceSlug: Record<string, Record<string, number>> = {};
      const discountMap: Record<string, number> = {};

      if (student.adminId) {
        const allPricing = await ServicePricing.find({ adminId: student.adminId }).lean();
        allPricing.forEach((p) => {
          pricingMapByServiceSlug[p.serviceSlug] = (p.prices as unknown as Record<string, number>) || {};
        });
      }

      const activeDiscounts = await StudentPlanDiscount.find({
        studentId: student._id,
        isActive: true,
      }).lean();
      activeDiscounts.forEach((d) => {
        discountMap[`${d.serviceSlug}::${d.planTier}`] = d.calculatedAmount || 0;
      });

      for (const reg of registrations) {
        let changed = false;
        const serviceDoc = reg.serviceId as any;
        const serviceSlug = serviceDoc?.slug as string | undefined;
        const planTier = reg.planTier;

        let baseAmount = reg.totalAmount ?? reg.paymentAmount;
        if ((!baseAmount || baseAmount <= 0) && serviceSlug && planTier) {
          const fallbackPrice = pricingMapByServiceSlug[serviceSlug]?.[planTier];
          if (fallbackPrice && fallbackPrice > 0) {
            baseAmount = fallbackPrice;
          }
        }

        if (baseAmount && baseAmount > 0) {
          if (!reg.paymentAmount || reg.paymentAmount <= 0) {
            reg.paymentAmount = baseAmount;
            changed = true;
          }
          if (!reg.totalAmount || reg.totalAmount <= 0) {
            reg.totalAmount = baseAmount;
            changed = true;
          }

          if (serviceSlug && planTier) {
            const discountAmount = discountMap[`${serviceSlug}::${planTier}`] || 0;
            if (discountAmount > 0) {
              const discountedValue = Math.max(0, baseAmount - discountAmount);
              if (reg.discountedAmount !== discountedValue) {
                reg.discountedAmount = discountedValue;
                changed = true;
              }
            } else if (reg.discountedAmount != null && reg.discountedAmount <= 0) {
              // Repair invalid zero discounted amount where no discount exists.
              reg.discountedAmount = undefined;
              changed = true;
            }
          }
        }

        if (changed) {
          await reg.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Registered services fetched successfully",
      data: { registrations },
    });
  } catch (error: any) {
    console.error("Get my services error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch registered services",
      error: error.message,
    });
  }
};

// Register for a service
export const registerForService = async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (!service.isActive) {
      return res.status(400).json({
        success: false,
        message: "Service is not currently available",
      });
    }

    // Check if already registered
    const existingRegistration = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId,
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "You are already registered for this service",
      });
    }

    // Create registration
    const registration = await StudentServiceRegistration.create({
      studentId: student._id,
      serviceId,
      status: ServiceRegistrationStatus.REGISTERED,
    });

    const populatedRegistration = await StudentServiceRegistration.findById(
      registration._id
    ).populate("serviceId");

    // Send email notification to super admin
    try {
      const superAdmin = await User.findOne({ role: USER_ROLE.SUPER_ADMIN });
      if (superAdmin) {
        const studentUser = await User.findById(userId);
        await sendServiceRegistrationEmailToSuperAdmin(
          superAdmin.email,
          [studentUser?.firstName, studentUser?.middleName, studentUser?.lastName].filter(Boolean).join(' ') || 'Unknown Student',
          studentUser?.email || 'Unknown Email',
          service.name
        );
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the registration if email fails
    }

    return res.status(201).json({
      success: true,
      message: "Successfully registered for service",
      data: { registration: populatedRegistration },
    });
  } catch (error: any) {
    console.error("Register for service error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register for service",
      error: error.message,
    });
  }
};

// Get service form structure (returns hardcoded config)
export const getServiceForm = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const partConfigs = getServiceFormStructure(service.slug);
    const formStructure = partConfigs.map(part => ({
      part: { key: part.key, title: part.title, description: part.description, order: part.order },
      order: part.order,
      sections: part.sections,
    }));

    return res.status(200).json({
      success: true,
      message: "Service form structure fetched successfully",
      data: { service, formStructure },
    });
  } catch (error: any) {
    console.error("Get service form error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service form",
      error: error.message,
    });
  }
};

// Get specific registration details
export const getRegistrationDetails = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId: student._id,
    })
      .populate("serviceId")
      .populate({
        path: "studentId",
        populate: [
          {
            path: "adminId",
            populate: { path: "userId", select: "firstName middleName lastName email" }
          },
          {
            path: "counselorId",
            populate: { path: "userId", select: "firstName middleName lastName email" }
          }
        ]
      })
      .populate({
        path: "primaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate({
        path: "secondaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate({
        path: "activeOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate({
        path: "primaryEduplanCoachId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate({
        path: "secondaryEduplanCoachId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate({
        path: "activeEduplanCoachId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration details fetched successfully",
      data: { registration },
    });
  } catch (error: any) {
    console.error("Get registration details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch registration details",
      error: error.message,
    });
  }
};


