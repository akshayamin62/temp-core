import { Request, Response } from "express";
import Service from "../models/Service";
import Student from "../models/Student";
import User from "../models/User";
import StudentServiceRegistration, {
  ServiceRegistrationStatus,
} from "../models/StudentServiceRegistration";
// import FormPart from "../models/FormPart";
import ServiceFormPart from "../models/ServiceFormPart";
import FormSection from "../models/FormSection";
import FormSubSection from "../models/FormSubSection";
import FormField from "../models/FormField";
import { AuthRequest } from "../types/auth";
import { USER_ROLE } from "../types/roles";
import { sendServiceRegistrationEmailToSuperAdmin } from "../utils/email";

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

// Get service form structure
export const getServiceForm = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    // Get service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Get form parts for this service
    const serviceParts = await ServiceFormPart.find({
      serviceId,
      isActive: true,
    })
      .populate("partId")
      .sort({ order: 1 });

    // Get sections for each part (sections are now only linked to part, not service)
    const formStructure = await Promise.all(
      serviceParts.map(async (servicePart: any) => {
        const sections = await FormSection.find({
          partId: servicePart.partId._id,
          isActive: true,
        }).sort({ order: 1 });

        const sectionsWithSubSections = await Promise.all(
          sections.map(async (section) => {
            const subSections = await FormSubSection.find({
              sectionId: section._id,
              isActive: true,
            }).sort({ order: 1 });

            const subSectionsWithFields = await Promise.all(
              subSections.map(async (subSection) => {
                const fields = await FormField.find({
                  subSectionId: subSection._id,
                  isActive: true,
                }).sort({ order: 1 });

                return {
                  ...subSection.toObject(),
                  fields,
                };
              })
            );

            return {
              ...section.toObject(),
              subSections: subSectionsWithFields,
            };
          })
        );

        return {
          part: servicePart.partId,
          order: servicePart.order,
          sections: sectionsWithSubSections,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Service form structure fetched successfully",
      data: {
        service,
        formStructure,
      },
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
    }).populate("serviceId");

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


