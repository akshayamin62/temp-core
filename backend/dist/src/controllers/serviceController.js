"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegistrationDetails = exports.getServiceForm = exports.registerForService = exports.getMyServices = exports.getAllServices = void 0;
const Service_1 = __importDefault(require("../models/Service"));
const Student_1 = __importDefault(require("../models/Student"));
const User_1 = __importDefault(require("../models/User"));
const StudentServiceRegistration_1 = __importStar(require("../models/StudentServiceRegistration"));
// import FormPart from "../models/FormPart";
const ServiceFormPart_1 = __importDefault(require("../models/ServiceFormPart"));
const FormSection_1 = __importDefault(require("../models/FormSection"));
const FormSubSection_1 = __importDefault(require("../models/FormSubSection"));
const FormField_1 = __importDefault(require("../models/FormField"));
const roles_1 = require("../types/roles");
const email_1 = require("../utils/email");
// Get all active services
const getAllServices = async (_req, res) => {
    try {
        const services = await Service_1.default.find({ isActive: true }).sort({ order: 1 });
        return res.status(200).json({
            success: true,
            message: "Services fetched successfully",
            data: { services },
        });
    }
    catch (error) {
        console.error("Get services error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch services",
            error: error.message,
        });
    }
};
exports.getAllServices = getAllServices;
// Get student's registered services
const getMyServices = async (req, res) => {
    try {
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        const registrations = await StudentServiceRegistration_1.default.find({
            studentId: student._id,
        })
            .populate("serviceId")
            .sort({ registeredAt: -1 });
        return res.status(200).json({
            success: true,
            message: "Registered services fetched successfully",
            data: { registrations },
        });
    }
    catch (error) {
        console.error("Get my services error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch registered services",
            error: error.message,
        });
    }
};
exports.getMyServices = getMyServices;
// Register for a service
const registerForService = async (req, res) => {
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
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        // Check if service exists
        const service = await Service_1.default.findById(serviceId);
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
        const existingRegistration = await StudentServiceRegistration_1.default.findOne({
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
        const registration = await StudentServiceRegistration_1.default.create({
            studentId: student._id,
            serviceId,
            status: StudentServiceRegistration_1.ServiceRegistrationStatus.REGISTERED,
        });
        const populatedRegistration = await StudentServiceRegistration_1.default.findById(registration._id).populate("serviceId");
        // Send email notification to super admin
        try {
            const superAdmin = await User_1.default.findOne({ role: roles_1.USER_ROLE.SUPER_ADMIN });
            if (superAdmin) {
                const studentUser = await User_1.default.findById(userId);
                await (0, email_1.sendServiceRegistrationEmailToSuperAdmin)(superAdmin.email, [studentUser?.firstName, studentUser?.middleName, studentUser?.lastName].filter(Boolean).join(' ') || 'Unknown Student', studentUser?.email || 'Unknown Email', service.name);
            }
        }
        catch (emailError) {
            console.error('Failed to send notification email:', emailError);
            // Don't fail the registration if email fails
        }
        return res.status(201).json({
            success: true,
            message: "Successfully registered for service",
            data: { registration: populatedRegistration },
        });
    }
    catch (error) {
        console.error("Register for service error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to register for service",
            error: error.message,
        });
    }
};
exports.registerForService = registerForService;
// Get service form structure
const getServiceForm = async (req, res) => {
    try {
        const { serviceId } = req.params;
        // Get service
        const service = await Service_1.default.findById(serviceId);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }
        // Get form parts for this service
        const serviceParts = await ServiceFormPart_1.default.find({
            serviceId,
            isActive: true,
        })
            .populate("partId")
            .sort({ order: 1 });
        // Get sections for each part (sections are now only linked to part, not service)
        const formStructure = await Promise.all(serviceParts.map(async (servicePart) => {
            const sections = await FormSection_1.default.find({
                partId: servicePart.partId._id,
                isActive: true,
            }).sort({ order: 1 });
            const sectionsWithSubSections = await Promise.all(sections.map(async (section) => {
                const subSections = await FormSubSection_1.default.find({
                    sectionId: section._id,
                    isActive: true,
                }).sort({ order: 1 });
                const subSectionsWithFields = await Promise.all(subSections.map(async (subSection) => {
                    const fields = await FormField_1.default.find({
                        subSectionId: subSection._id,
                        isActive: true,
                    }).sort({ order: 1 });
                    return {
                        ...subSection.toObject(),
                        fields,
                    };
                }));
                return {
                    ...section.toObject(),
                    subSections: subSectionsWithFields,
                };
            }));
            return {
                part: servicePart.partId,
                order: servicePart.order,
                sections: sectionsWithSubSections,
            };
        }));
        return res.status(200).json({
            success: true,
            message: "Service form structure fetched successfully",
            data: {
                service,
                formStructure,
            },
        });
    }
    catch (error) {
        console.error("Get service form error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch service form",
            error: error.message,
        });
    }
};
exports.getServiceForm = getServiceForm;
// Get specific registration details
const getRegistrationDetails = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        const registration = await StudentServiceRegistration_1.default.findOne({
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
    }
    catch (error) {
        console.error("Get registration details error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch registration details",
            error: error.message,
        });
    }
};
exports.getRegistrationDetails = getRegistrationDetails;
//# sourceMappingURL=serviceController.js.map