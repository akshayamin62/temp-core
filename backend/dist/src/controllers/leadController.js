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
exports.getAllLeads = exports.getCounselorEnquiryFormUrl = exports.getEnquiryFormUrl = exports.getCounselorLeads = exports.getAdminCounselors = exports.updateLeadStage = exports.assignLeadToCounselor = exports.getLeadDetail = exports.getAdminLeads = exports.getAdminInfoBySlug = exports.submitEnquiry = exports.getUniqueSlug = exports.generateSlug = void 0;
const Lead_1 = __importStar(require("../models/Lead"));
const Admin_1 = __importDefault(require("../models/Admin"));
const Counselor_1 = __importDefault(require("../models/Counselor"));
// import User from "../models/User";
const roles_1 = require("../types/roles");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Generate a unique slug from a name
 */
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Remove consecutive hyphens
        .substring(0, 50); // Limit length
};
exports.generateSlug = generateSlug;
/**
 * Check if slug exists and return a unique version
 */
const getUniqueSlug = async (baseSlug) => {
    let slug = baseSlug;
    let counter = 1;
    while (await Admin_1.default.findOne({ enquiryFormSlug: slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
};
exports.getUniqueSlug = getUniqueSlug;
/**
 * PUBLIC: Submit enquiry form (no auth required)
 */
const submitEnquiry = async (req, res) => {
    try {
        const { adminSlug } = req.params;
        const { name, email, mobileNumber, city, serviceTypes } = req.body;
        // Validation
        if (!name || !email || !mobileNumber || !city || !serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: name, email, mobileNumber, city, serviceTypes (at least one)",
            });
        }
        // Validate service types
        for (const service of serviceTypes) {
            if (!Object.values(Lead_1.SERVICE_TYPE).includes(service)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid service type: ${service}`,
                });
            }
        }
        // Find admin by slug
        const admin = await Admin_1.default.findOne({ enquiryFormSlug: adminSlug.toLowerCase() });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Invalid enquiry form link",
            });
        }
        // Check for duplicate lead (same email for same admin within last 24 hours)
        const existingLead = await Lead_1.default.findOne({
            email: email.toLowerCase(),
            adminId: admin.userId,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        if (existingLead) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted an enquiry recently. Please wait 24 hours before submitting again.",
            });
        }
        // Create lead
        const newLead = new Lead_1.default({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            mobileNumber: mobileNumber.trim(),
            city: city.trim(),
            serviceTypes,
            adminId: admin.userId,
            stage: Lead_1.LEAD_STAGE.NEW,
            source: "Enquiry Form",
        });
        await newLead.save();
        return res.status(201).json({
            success: true,
            message: "Thank you for your enquiry! We will contact you soon.",
        });
    }
    catch (error) {
        console.error("Submit enquiry error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit enquiry. Please try again later.",
        });
    }
};
exports.submitEnquiry = submitEnquiry;
/**
 * PUBLIC: Get admin info for enquiry form
 */
const getAdminInfoBySlug = async (req, res) => {
    try {
        const { adminSlug } = req.params;
        const admin = await Admin_1.default.findOne({ enquiryFormSlug: adminSlug.toLowerCase() })
            .populate("userId", "firstName middleName lastName");
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Invalid enquiry form link",
            });
        }
        return res.json({
            success: true,
            data: {
                adminName: [admin.userId?.firstName, admin.userId?.middleName, admin.userId?.lastName].filter(Boolean).join(' ') || "Kareer Studio",
                companyName: admin.companyName || "Kareer Studio",
                companyLogo: admin.companyLogo || null,
                services: Object.values(Lead_1.SERVICE_TYPE),
            },
        });
    }
    catch (error) {
        console.error("Get admin info error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load form",
        });
    }
};
exports.getAdminInfoBySlug = getAdminInfoBySlug;
/**
 * ADMIN: Get all leads for this admin
 */
const getAdminLeads = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        const { stage, serviceTypes, assigned, search } = req.query;
        // Build filter
        const filter = { adminId: adminUserId };
        if (stage) {
            filter.stage = stage;
        }
        if (serviceTypes) {
            filter.serviceTypes = { $in: [serviceTypes] };
        }
        if (assigned === "true") {
            filter.assignedCounselorId = { $ne: null };
        }
        else if (assigned === "false") {
            filter.assignedCounselorId = null;
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { mobileNumber: { $regex: search, $options: "i" } },
            ];
        }
        const leads = await Lead_1.default.find(filter)
            .populate({
            path: "assignedCounselorId",
            populate: { path: "userId", select: "firstName middleName lastName email" }
        })
            .sort({ createdAt: -1 });
        // Get stats
        const allLeads = await Lead_1.default.find({ adminId: adminUserId });
        const stats = {
            total: allLeads.length,
            new: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.NEW).length,
            hot: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.HOT).length,
            warm: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.WARM).length,
            cold: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.COLD).length,
            converted: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.CONVERTED).length,
            closed: allLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.CLOSED).length,
            unassigned: allLeads.filter((l) => !l.assignedCounselorId).length,
        };
        return res.json({
            success: true,
            data: {
                leads,
                stats,
            },
        });
    }
    catch (error) {
        console.error("Get admin leads error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
        });
    }
};
exports.getAdminLeads = getAdminLeads;
/**
 * ADMIN: Get single lead detail
 */
const getLeadDetail = async (req, res) => {
    try {
        const { leadId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const lead = await Lead_1.default.findById(leadId)
            .populate({
            path: "assignedCounselorId",
            populate: { path: "userId", select: "firstName middleName lastName email" }
        })
            .populate("adminId", "firstName middleName lastName email");
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }
        // Check access: Admin can access their own leads, Counselor can access assigned leads
        if (userRole === roles_1.USER_ROLE.ADMIN) {
            if (lead.adminId._id.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        else if (userRole === roles_1.USER_ROLE.COUNSELOR) {
            // Find counselor document by userId
            const counselor = await Counselor_1.default.findOne({ userId: userId });
            if (!counselor || !lead.assignedCounselorId || lead.assignedCounselorId._id.toString() !== counselor._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        return res.json({
            success: true,
            data: { lead },
        });
    }
    catch (error) {
        console.error("Get lead detail error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch lead details",
        });
    }
};
exports.getLeadDetail = getLeadDetail;
/**
 * ADMIN: Assign lead to counselor
 */
const assignLeadToCounselor = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { counselorId } = req.body;
        const adminUserId = req.user?.userId;
        const lead = await Lead_1.default.findById(leadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }
        // Check lead belongs to this admin
        if (lead.adminId.toString() !== adminUserId) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        // If counselorId is null, unassign the lead
        if (!counselorId) {
            lead.assignedCounselorId = undefined;
            await lead.save();
            return res.json({
                success: true,
                message: "Lead unassigned successfully",
                data: { lead },
            });
        }
        // Verify counselor belongs to this admin
        const counselor = await Counselor_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(counselorId),
            adminId: new mongoose_1.default.Types.ObjectId(adminUserId),
        }).populate("userId", "firstName middleName lastName email");
        if (!counselor) {
            return res.status(400).json({
                success: false,
                message: "Invalid counselor or counselor does not belong to you",
            });
        }
        lead.assignedCounselorId = new mongoose_1.default.Types.ObjectId(counselorId);
        // No automatic status change on assignment
        await lead.save();
        return res.json({
            success: true,
            message: "Lead assigned successfully",
            data: { lead },
        });
    }
    catch (error) {
        console.error("Assign lead error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to assign lead",
        });
    }
};
exports.assignLeadToCounselor = assignLeadToCounselor;
/**
 * ADMIN/COUNSELOR: Update lead stage
 */
const updateLeadStage = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { stage } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!Object.values(Lead_1.LEAD_STAGE).includes(stage)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stage",
            });
        }
        const lead = await Lead_1.default.findById(leadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }
        // If lead is already converted and approved, stage is locked
        if (lead.stage === Lead_1.LEAD_STAGE.CONVERTED && lead.conversionStatus === 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: "Cannot change stage. This lead has been converted to a student.",
            });
        }
        // Prevent direct change to CONVERTED stage - must use conversion flow
        if (stage === Lead_1.LEAD_STAGE.CONVERTED) {
            return res.status(400).json({
                success: false,
                message: "Cannot directly change to 'Converted to Student'. Please use the conversion request flow.",
            });
        }
        // Check access
        if (userRole === roles_1.USER_ROLE.ADMIN) {
            if (lead.adminId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        else if (userRole === roles_1.USER_ROLE.COUNSELOR) {
            // Find counselor document by userId (same pattern as getLeadDetail)
            const counselor = await Counselor_1.default.findOne({ userId: userId });
            if (!counselor || !lead.assignedCounselorId || lead.assignedCounselorId.toString() !== counselor._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        lead.stage = stage;
        await lead.save();
        return res.json({
            success: true,
            message: "Lead stage updated",
            data: { lead },
        });
    }
    catch (error) {
        console.error("Update lead stage error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update lead stage",
        });
    }
};
exports.updateLeadStage = updateLeadStage;
/**
 * ADMIN: Get counselors for assignment dropdown
 */
const getAdminCounselors = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        const counselors = await Counselor_1.default.find({ adminId: adminUserId })
            .populate("userId", "firstName middleName lastName email isActive");
        const activeCounselors = counselors.filter((c) => c.userId?.isActive);
        return res.json({
            success: true,
            data: {
                counselors: activeCounselors.map((c) => ({
                    _id: c._id,
                    firstName: c.userId?.firstName,
                    middleName: c.userId?.middleName,
                    lastName: c.userId?.lastName,
                    email: c.userId.email,
                })),
            },
        });
    }
    catch (error) {
        console.error("Get admin counselors error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch counselors",
        });
    }
};
exports.getAdminCounselors = getAdminCounselors;
/**
 * COUNSELOR: Get assigned leads
 */
const getCounselorLeads = async (req, res) => {
    try {
        const counselorUserId = req.user?.userId;
        const { stage, serviceTypes, search } = req.query;
        // Find counselor document
        const counselor = await Counselor_1.default.findOne({ userId: counselorUserId });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: "Counselor profile not found",
            });
        }
        // Build filter
        const filter = { assignedCounselorId: counselor._id };
        if (stage) {
            filter.stage = stage;
        }
        if (serviceTypes) {
            filter.serviceTypes = { $in: [serviceTypes] };
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { mobileNumber: { $regex: search, $options: "i" } },
            ];
        }
        const leads = await Lead_1.default.find(filter)
            .populate("adminId", "firstName middleName lastName email")
            .sort({ createdAt: -1 });
        // Get stats
        const allAssignedLeads = await Lead_1.default.find({ assignedCounselorId: counselor._id });
        const stats = {
            total: allAssignedLeads.length,
            new: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.NEW).length,
            hot: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.HOT).length,
            warm: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.WARM).length,
            cold: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.COLD).length,
            converted: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.CONVERTED).length,
            closed: allAssignedLeads.filter((l) => l.stage === Lead_1.LEAD_STAGE.CLOSED).length,
        };
        return res.json({
            success: true,
            data: {
                leads,
                stats,
            },
        });
    }
    catch (error) {
        console.error("Get counselor leads error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
        });
    }
};
exports.getCounselorLeads = getCounselorLeads;
/**
 * ADMIN: Get enquiry form URL
 */
const getEnquiryFormUrl = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        const admin = await Admin_1.default.findOne({ userId: adminUserId });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin profile not found",
            });
        }
        return res.json({
            success: true,
            data: {
                slug: admin.enquiryFormSlug,
            },
        });
    }
    catch (error) {
        console.error("Get enquiry form URL error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get enquiry form URL",
        });
    }
};
exports.getEnquiryFormUrl = getEnquiryFormUrl;
/**
 * COUNSELOR: Get enquiry form URL (their admin's URL)
 */
const getCounselorEnquiryFormUrl = async (req, res) => {
    try {
        const counselorUserId = req.user?.userId;
        // Find counselor profile to get their adminId
        const counselor = await Counselor_1.default.findOne({ userId: counselorUserId });
        if (!counselor) {
            return res.status(404).json({
                success: false,
                message: "Counselor profile not found",
            });
        }
        // Find the admin's profile using the adminId from counselor
        const admin = await Admin_1.default.findOne({ userId: counselor.adminId });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin profile not found",
            });
        }
        return res.json({
            success: true,
            data: {
                slug: admin.enquiryFormSlug,
            },
        });
    }
    catch (error) {
        console.error("Get counselor enquiry form URL error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get enquiry form URL",
        });
    }
};
exports.getCounselorEnquiryFormUrl = getCounselorEnquiryFormUrl;
/**
 * SUPER_ADMIN: Get all leads (for analytics)
 */
const getAllLeads = async (req, res) => {
    try {
        const { adminId, stage, serviceTypes } = req.query;
        const filter = {};
        if (adminId) {
            filter.adminId = adminId;
        }
        if (stage) {
            filter.stage = stage;
        }
        if (serviceTypes) {
            filter.serviceTypes = { $in: [serviceTypes] };
        }
        const leads = await Lead_1.default.find(filter)
            .populate("adminId", "firstName middleName lastName email")
            .populate("assignedCounselorId", "firstName middleName lastName email")
            .sort({ createdAt: -1 });
        // Get overall stats
        const totalLeads = await Lead_1.default.countDocuments();
        const leadsByStage = await Lead_1.default.aggregate([
            { $group: { _id: "$stage", count: { $sum: 1 } } },
        ]);
        const leadsByService = await Lead_1.default.aggregate([
            { $unwind: "$serviceTypes" },
            { $group: { _id: "$serviceTypes", count: { $sum: 1 } } },
        ]);
        const leadsByAdmin = await Lead_1.default.aggregate([
            { $group: { _id: "$adminId", count: { $sum: 1 } } },
        ]);
        return res.json({
            success: true,
            data: {
                leads,
                stats: {
                    total: totalLeads,
                    byStage: leadsByStage,
                    byService: leadsByService,
                    byAdmin: leadsByAdmin,
                },
            },
        });
    }
    catch (error) {
        console.error("Get all leads error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
        });
    }
};
exports.getAllLeads = getAllLeads;
//# sourceMappingURL=leadController.js.map