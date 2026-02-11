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
exports.deleteDocument = exports.addCustomField = exports.rejectDocument = exports.approveDocument = exports.viewDocument = exports.downloadDocument = exports.getDocuments = exports.uploadDocument = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StudentDocument_1 = __importStar(require("../models/StudentDocument"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const Student_1 = __importDefault(require("../models/Student"));
const Ops_1 = __importDefault(require("../models/Ops"));
const User_1 = __importDefault(require("../models/User"));
const email_1 = require("../utils/email");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadDir_1 = require("../utils/uploadDir");
// Upload document (auto-save)
const uploadDocument = async (req, res) => {
    try {
        const { registrationId, documentKey, documentName, category, isCustomField } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }
        // Verify registration exists
        const registration = await StudentServiceRegistration_1.default.findById(registrationId);
        if (!registration) {
            // Delete uploaded file
            fs_1.default.unlinkSync(file.path);
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        const studentId = registration.studentId;
        // Create student directory
        const studentDir = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), studentId.toString());
        (0, uploadDir_1.ensureDir)(studentDir);
        // Generate final filename and move file to student folder
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        const sanitizedName = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
        const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
        const finalPath = path_1.default.join(studentDir, finalFilename);
        fs_1.default.renameSync(file.path, finalPath);
        // Determine status based on uploader role
        const userRole = req.user.role;
        const documentStatus = (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
            ? StudentDocument_1.DocumentStatus.APPROVED
            : StudentDocument_1.DocumentStatus.PENDING;
        // For allowMultiple fields, always create new document
        // For single fields, check and replace existing document
        const allowMultiple = req.body.allowMultiple === "true" || req.body.allowMultiple === true;
        let document;
        if (!allowMultiple) {
            // Check for existing document (single file field)
            const existingDoc = await StudentDocument_1.default.findOne({
                registrationId,
                documentKey,
            });
            if (existingDoc) {
                // Delete old file
                const oldFilePath = path_1.default.join(process.cwd(), existingDoc.filePath);
                if (fs_1.default.existsSync(oldFilePath)) {
                    fs_1.default.unlinkSync(oldFilePath);
                }
                // Update with new file
                existingDoc.fileName = finalFilename;
                existingDoc.filePath = `uploads/${studentId}/${finalFilename}`;
                existingDoc.fileSize = file.size;
                existingDoc.mimeType = file.mimetype;
                existingDoc.uploadedAt = new Date();
                existingDoc.uploadedBy = new mongoose_1.default.Types.ObjectId(req.user.userId);
                existingDoc.uploadedByRole = req.user.role;
                existingDoc.status = documentStatus;
                existingDoc.version += 1;
                existingDoc.approvedBy = (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                    ? new mongoose_1.default.Types.ObjectId(req.user.userId)
                    : undefined;
                existingDoc.approvedAt = (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                    ? new Date()
                    : undefined;
                document = await existingDoc.save();
            }
            else {
                // Create new document
                document = await StudentDocument_1.default.create({
                    registrationId,
                    studentId,
                    documentCategory: category,
                    documentName,
                    documentKey,
                    fileName: finalFilename,
                    filePath: `uploads/${studentId}/${finalFilename}`,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    uploadedBy: new mongoose_1.default.Types.ObjectId(req.user.userId),
                    uploadedByRole: req.user.role,
                    status: documentStatus,
                    isCustomField: isCustomField === "true" || isCustomField === true,
                    version: 1,
                    approvedBy: (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                        ? new mongoose_1.default.Types.ObjectId(req.user.userId)
                        : undefined,
                    approvedAt: (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                        ? new Date()
                        : undefined,
                });
            }
        }
        else {
            // Always create new document for multiple file fields
            document = await StudentDocument_1.default.create({
                registrationId,
                studentId,
                documentCategory: category,
                documentName,
                documentKey,
                fileName: finalFilename,
                filePath: `uploads/${studentId}/${finalFilename}`,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedBy: new mongoose_1.default.Types.ObjectId(req.user.userId),
                uploadedByRole: req.user.role,
                status: documentStatus,
                isCustomField: isCustomField === "true" || isCustomField === true,
                version: 1,
                approvedBy: (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                    ? new mongoose_1.default.Types.ObjectId(req.user.userId)
                    : undefined,
                approvedAt: (userRole === 'SUPER_ADMIN' || userRole === 'OPS')
                    ? new Date()
                    : undefined,
            });
        }
        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: { document },
        });
    }
    catch (error) {
        console.warn("Document upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload document",
        });
    }
};
exports.uploadDocument = uploadDocument;
// Get all documents for a registration
const getDocuments = async (req, res) => {
    try {
        const { registrationId } = req.params;
        // Verify registration exists and user has access
        const registration = await StudentServiceRegistration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        // Authorization check
        const userRole = req.user.role;
        const userId = req.user.userId;
        if (userRole === "STUDENT") {
            // Students can only see their own documents
            // Get student record to compare userId
            const student = await Student_1.default.findById(registration.studentId);
            if (!student || student.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        else if (userRole === "OPS") {
            // Ops can see documents of assigned students
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        // Admins can see all documents
        // Get all documents
        const documents = await StudentDocument_1.default.find({ registrationId })
            .populate("uploadedBy", "firstName middleName lastName email")
            .populate("approvedBy", "firstName middleName lastName email")
            .populate("rejectedBy", "firstName middleName lastName email")
            .sort({ documentCategory: 1, createdAt: 1 });
        // Group by category
        const primary = documents.filter(doc => doc.documentCategory === "PRIMARY");
        const secondary = documents.filter(doc => doc.documentCategory === "SECONDARY");
        return res.status(200).json({
            success: true,
            data: {
                documents,
                primary,
                secondary,
            },
        });
    }
    catch (error) {
        console.warn("Get documents error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
        });
    }
};
exports.getDocuments = getDocuments;
// Download document
const downloadDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await StudentDocument_1.default.findById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }
        // Verify access
        const registration = await StudentServiceRegistration_1.default.findById(document.registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        const userRole = req.user.role;
        const userId = req.user.userId;
        if (userRole === "STUDENT") {
            // Get student record to compare userId
            const student = await Student_1.default.findById(registration.studentId);
            if (!student || student.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        else if (userRole === "OPS") {
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        // Stream file
        const filePath = path_1.default.join(process.cwd(), document.filePath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File not found on server",
            });
        }
        return res.download(filePath, document.fileName);
    }
    catch (error) {
        console.warn("Download document error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to download document",
        });
    }
};
exports.downloadDocument = downloadDocument;
// View document (inline - no download)
const viewDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await StudentDocument_1.default.findById(documentId);
        if (!document) {
            res.status(404).json({
                success: false,
                message: "Document not found",
            });
            return;
        }
        // Verify access
        const registration = await StudentServiceRegistration_1.default.findById(document.registrationId);
        if (!registration) {
            res.status(404).json({
                success: false,
                message: "Registration not found",
            });
            return;
        }
        const userRole = req.user.role;
        const userId = req.user.userId;
        if (userRole === "STUDENT") {
            // Get student record to compare userId
            const student = await Student_1.default.findById(registration.studentId);
            if (!student || student.userId.toString() !== userId) {
                res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
                return;
            }
        }
        else if (userRole === "OPS") {
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
                return;
            }
        }
        // Stream file for viewing
        const filePath = path_1.default.join(process.cwd(), document.filePath);
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                message: "File not found on server",
            });
            return;
        }
        // Set content type and inline disposition for viewing
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.on('error', (error) => {
            console.warn("File stream error:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Failed to stream document",
                });
            }
        });
        fileStream.pipe(res);
    }
    catch (error) {
        console.warn("View document error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to view document",
        });
    }
};
exports.viewDocument = viewDocument;
// Approve document (OPS/Admin only)
const approveDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userRole = req.user.role;
        if (userRole !== "OPS" && userRole !== "SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only ops and admins can approve documents",
            });
        }
        const document = await StudentDocument_1.default.findById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }
        // Verify OPS is assigned (for OPS role)
        if (userRole === "OPS") {
            const registration = await StudentServiceRegistration_1.default.findById(document.registrationId);
            if (!registration) {
                return res.status(404).json({
                    success: false,
                    message: "Registration not found",
                });
            }
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === req.user.userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === req.user.userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        document.status = StudentDocument_1.DocumentStatus.APPROVED;
        document.approvedBy = new mongoose_1.default.Types.ObjectId(req.user.userId);
        document.approvedAt = new Date();
        document.rejectionMessage = undefined;
        document.rejectedBy = undefined;
        document.rejectedAt = undefined;
        await document.save();
        return res.status(200).json({
            success: true,
            message: "Document approved successfully",
            data: { document },
        });
    }
    catch (error) {
        console.warn("Approve document error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve document",
        });
    }
};
exports.approveDocument = approveDocument;
// Reject document (OPS/Admin only)
const rejectDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { rejectionMessage } = req.body;
        const userRole = req.user.role;
        if (userRole !== "OPS" && userRole !== "SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only ops and admins can reject documents",
            });
        }
        if (!rejectionMessage || rejectionMessage.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Rejection message is required",
            });
        }
        const document = await StudentDocument_1.default.findById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }
        // Verify OPS is assigned (for OPS role)
        if (userRole === "OPS") {
            const registration = await StudentServiceRegistration_1.default.findById(document.registrationId);
            if (!registration) {
                return res.status(404).json({
                    success: false,
                    message: "Registration not found",
                });
            }
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === req.user.userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === req.user.userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        // Delete file from storage
        const filePath = path_1.default.join(process.cwd(), document.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Send email notification to student BEFORE deleting from database
        try {
            const registration = await StudentServiceRegistration_1.default.findById(document.registrationId);
            if (registration) {
                const student = await Student_1.default.findById(registration.studentId);
                if (student) {
                    const user = await User_1.default.findById(student.userId);
                    if (user && user.email) {
                        const rejectedByRole = userRole === 'SUPER_ADMIN' ? 'super_admin' : 'OPS';
                        const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
                        await (0, email_1.sendDocumentRejectionEmail)(user.email, fullName, document.documentName, rejectionMessage, rejectedByRole, document.registrationId.toString());
                        console.log(`✅ Document rejection email sent to ${user.email}`);
                    }
                }
            }
        }
        catch (emailError) {
            console.warn("⚠️ Failed to send rejection email:", emailError);
            // Don't fail the request if email fails
        }
        // Delete document from database completely
        await StudentDocument_1.default.findByIdAndDelete(documentId);
        return res.status(200).json({
            success: true,
            message: "Document rejected and deleted successfully",
        });
    }
    catch (error) {
        console.warn("Reject document error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject document",
        });
    }
};
exports.rejectDocument = rejectDocument;
// Add custom document field
const addCustomField = async (req, res) => {
    try {
        const { registrationId, documentName, category } = req.body;
        if (!registrationId || !documentName || !category) {
            return res.status(400).json({
                success: false,
                message: "registrationId, documentName, and category are required",
            });
        }
        // Verify registration exists
        const registration = await StudentServiceRegistration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        // Authorization check
        const userRole = req.user.role;
        const userId = req.user.userId;
        if (userRole === "STUDENT") {
            // Get student record to compare userId
            const student = await Student_1.default.findById(registration.studentId);
            if (!student || student.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        else if (userRole === "OPS") {
            let hasAccess = false;
            if (registration.primaryOpsId) {
                const primaryOps = await Ops_1.default.findById(registration.primaryOpsId);
                if (primaryOps && primaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess && registration.secondaryOpsId) {
                const secondaryOps = await Ops_1.default.findById(registration.secondaryOpsId);
                if (secondaryOps && secondaryOps.userId.toString() === userId) {
                    hasAccess = true;
                }
            }
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }
        }
        // Generate unique document key
        const documentKey = `custom_${Date.now()}_${documentName.toLowerCase().replace(/\s+/g, "_")}`;
        return res.status(201).json({
            success: true,
            message: "Custom field created successfully",
            data: {
                documentKey,
                documentName,
                category,
                isCustomField: true,
            },
        });
    }
    catch (error) {
        console.warn("Add custom field error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add custom field",
        });
    }
};
exports.addCustomField = addCustomField;
// Delete document (Admin only or rejected documents by student)
const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userRole = req.user.role;
        const document = await StudentDocument_1.default.findById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }
        // Only admin can delete documents
        if (userRole !== "SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only admins can delete documents",
            });
        }
        // Delete file from storage
        const filePath = path_1.default.join(process.cwd(), document.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Delete document record
        await StudentDocument_1.default.findByIdAndDelete(documentId);
        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
        });
    }
    catch (error) {
        console.warn("Delete document error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete document",
        });
    }
};
exports.deleteDocument = deleteDocument;
//# sourceMappingURL=documentController.js.map