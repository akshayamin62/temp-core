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
exports.deleteDocumentField = exports.addDocumentField = exports.getDocumentFields = void 0;
const FormField_1 = __importStar(require("../models/FormField"));
const FormSubSection_1 = __importDefault(require("../models/FormSubSection"));
const FormSection_1 = __importDefault(require("../models/FormSection"));
const FormPart_1 = __importStar(require("../models/FormPart"));
// Get all document fields (FILE type fields from DOCUMENT part)
const getDocumentFields = async (_req, res) => {
    try {
        // Find DOCUMENT part
        const documentPart = await FormPart_1.default.findOne({ key: FormPart_1.FormPartKey.DOCUMENT });
        if (!documentPart) {
            return res.status(404).json({
                success: false,
                message: "Document part not found",
            });
        }
        // Find all sections for DOCUMENT part
        const documentSections = await FormSection_1.default.find({
            partId: documentPart._id,
            isActive: true
        }).sort({ order: 1 });
        const result = [];
        for (const section of documentSections) {
            // Find subsections
            const subsections = await FormSubSection_1.default.find({
                sectionId: section._id,
                isActive: true
            }).sort({ order: 1 });
            for (const subsection of subsections) {
                // Find FILE type fields
                const fields = await FormField_1.default.find({
                    subSectionId: subsection._id,
                    type: FormField_1.FieldType.FILE,
                    isActive: true
                }).sort({ order: 1 });
                // Map fields to response format
                for (const field of fields) {
                    result.push({
                        _id: field._id,
                        documentKey: field.key,
                        documentName: field.label,
                        category: subsection.title.includes('Primary') ? 'PRIMARY' : 'SECONDARY',
                        required: field.required,
                        helpText: field.helpText,
                        order: field.order,
                        sectionTitle: section.title,
                        subsectionTitle: subsection.title,
                        subsectionId: subsection._id,
                    });
                }
            }
        }
        return res.status(200).json({
            success: true,
            data: { fields: result },
        });
    }
    catch (error) {
        console.error("Get document fields error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch document fields",
        });
    }
};
exports.getDocumentFields = getDocumentFields;
// Add new document field (Admin/OPS only)
const addDocumentField = async (req, res) => {
    try {
        const { documentName, category, required, helpText } = req.body;
        if (!documentName || !category) {
            return res.status(400).json({
                success: false,
                message: "Document name and category are required",
            });
        }
        // Validate category
        if (!['PRIMARY', 'SECONDARY'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Category must be PRIMARY or SECONDARY",
            });
        }
        // Find DOCUMENT part
        const documentPart = await FormPart_1.default.findOne({ key: FormPart_1.FormPartKey.DOCUMENT });
        if (!documentPart) {
            return res.status(404).json({
                success: false,
                message: "Document part not found",
            });
        }
        // Find "Your Documents" section
        const yourDocsSection = await FormSection_1.default.findOne({
            partId: documentPart._id,
            title: "Your Documents"
        });
        if (!yourDocsSection) {
            return res.status(404).json({
                success: false,
                message: "Your Documents section not found",
            });
        }
        // Find appropriate subsection
        const subsectionTitle = category === 'PRIMARY' ? 'Primary Documents' : 'Secondary Documents';
        const subsection = await FormSubSection_1.default.findOne({
            sectionId: yourDocsSection._id,
            title: subsectionTitle
        });
        if (!subsection) {
            return res.status(404).json({
                success: false,
                message: `${subsectionTitle} subsection not found`,
            });
        }
        // Generate document key from name
        const documentKey = documentName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
        // Check if key already exists
        const existingField = await FormField_1.default.findOne({
            subSectionId: subsection._id,
            key: documentKey
        });
        if (existingField) {
            return res.status(400).json({
                success: false,
                message: "A document field with this name already exists",
            });
        }
        // Get max order for this subsection
        const maxOrderField = await FormField_1.default.findOne({
            subSectionId: subsection._id
        }).sort({ order: -1 });
        const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;
        // Create new field
        const newField = await FormField_1.default.create({
            subSectionId: subsection._id,
            label: documentName,
            key: documentKey,
            type: FormField_1.FieldType.FILE,
            required: required || false,
            order: nextOrder,
            isActive: true,
            helpText: helpText || undefined,
        });
        return res.status(201).json({
            success: true,
            message: "Document field created successfully",
            data: {
                field: {
                    _id: newField._id,
                    documentKey: newField.key,
                    documentName: newField.label,
                    category,
                    required: newField.required,
                    helpText: newField.helpText,
                    order: newField.order,
                    subsectionId: subsection._id,
                }
            },
        });
    }
    catch (error) {
        console.error("Add document field error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add document field",
        });
    }
};
exports.addDocumentField = addDocumentField;
// Delete document field (Admin only)
const deleteDocumentField = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const field = await FormField_1.default.findById(fieldId);
        if (!field) {
            return res.status(404).json({
                success: false,
                message: "Document field not found",
            });
        }
        // Verify it's a FILE type field
        if (field.type !== FormField_1.FieldType.FILE) {
            return res.status(400).json({
                success: false,
                message: "This is not a document field",
            });
        }
        // Soft delete by setting isActive to false
        field.isActive = false;
        await field.save();
        return res.status(200).json({
            success: true,
            message: "Document field deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete document field error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete document field",
        });
    }
};
exports.deleteDocumentField = deleteDocumentField;
//# sourceMappingURL=formFieldController.js.map