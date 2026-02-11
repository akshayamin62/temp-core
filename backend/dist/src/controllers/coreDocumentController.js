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
exports.deleteCOREDocumentField = exports.addCOREDocumentField = exports.getCOREDocumentFields = void 0;
const COREDocumentField_1 = __importStar(require("../models/COREDocumentField"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const mongoose_1 = __importDefault(require("mongoose"));
// Get CORE document fields for a specific student
const getCOREDocumentFields = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { type } = req.query; // 'CORE' | 'EXTRA' | undefined
        // Verify registration exists
        const registration = await StudentServiceRegistration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        // Build query with optional type filter
        const query = {
            studentId: registration.studentId,
            registrationId,
            isActive: true,
        };
        // Filter by documentType if provided
        if (type && Object.values(COREDocumentField_1.COREDocumentType).includes(type)) {
            query.documentType = type;
        }
        // Get CORE document fields for this student
        const fields = await COREDocumentField_1.default.find(query)
            .sort({ order: 1, createdAt: 1 })
            .populate("createdBy", "firstName middleName lastName email");
        return res.status(200).json({
            success: true,
            data: { fields },
        });
    }
    catch (error) {
        console.error("Get CORE document fields error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch CORE document fields",
        });
    }
};
exports.getCOREDocumentFields = getCOREDocumentFields;
// Add new CORE document field for a specific student (Admin/OPS only)
const addCOREDocumentField = async (req, res) => {
    try {
        const { registrationId, documentName, category, required, helpText, allowMultiple, documentType } = req.body;
        if (!registrationId || !documentName) {
            return res.status(400).json({
                success: false,
                message: "Registration ID and document name are required",
            });
        }
        // Validate documentType if provided
        const validDocType = documentType && Object.values(COREDocumentField_1.COREDocumentType).includes(documentType)
            ? documentType
            : COREDocumentField_1.COREDocumentType.CORE;
        // Verify registration exists
        const registration = await StudentServiceRegistration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }
        // Generate document key from name with type prefix
        const prefix = validDocType === COREDocumentField_1.COREDocumentType.EXTRA ? "extra" : "core";
        const documentKey = `${prefix}_${documentName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")}_${Date.now()}`;
        // Get max order for this student's documents of same type
        const maxOrderField = await COREDocumentField_1.default.findOne({
            studentId: registration.studentId,
            registrationId,
            documentType: validDocType,
        }).sort({ order: -1 });
        const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;
        // Create new CORE document field
        const newField = await COREDocumentField_1.default.create({
            studentId: registration.studentId,
            registrationId,
            documentName,
            documentKey,
            documentType: validDocType,
            category: category || "SECONDARY",
            required: required || false,
            helpText: helpText || undefined,
            allowMultiple: allowMultiple || false,
            order: nextOrder,
            isActive: true,
            createdBy: new mongoose_1.default.Types.ObjectId(req.user.userId),
            createdByRole: req.user.role,
        });
        return res.status(201).json({
            success: true,
            message: "CORE document field created successfully",
            data: { field: newField },
        });
    }
    catch (error) {
        console.error("Add CORE document field error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add CORE document field",
        });
    }
};
exports.addCOREDocumentField = addCOREDocumentField;
// Delete CORE document field (Admin/OPS only)
const deleteCOREDocumentField = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const field = await COREDocumentField_1.default.findById(fieldId);
        if (!field) {
            return res.status(404).json({
                success: false,
                message: "CORE document field not found",
            });
        }
        // Soft delete by setting isActive to false
        field.isActive = false;
        await field.save();
        return res.status(200).json({
            success: true,
            message: "CORE document field deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete CORE document field error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete CORE document field",
        });
    }
};
exports.deleteCOREDocumentField = deleteCOREDocumentField;
//# sourceMappingURL=coreDocumentController.js.map