import { Response } from "express";
import { AuthRequest } from "../types/auth";
import FormField, { FieldType } from "../models/FormField";
import FormSubSection from "../models/FormSubSection";
import FormSection from "../models/FormSection";
import FormPart, { FormPartKey } from "../models/FormPart";

// Get all document fields (FILE type fields from DOCUMENT part)
export const getDocumentFields = async (_req: AuthRequest, res: Response) => {
  try {
    // Find DOCUMENT part
    const documentPart = await FormPart.findOne({ key: FormPartKey.DOCUMENT });
    if (!documentPart) {
      return res.status(404).json({
        success: false,
        message: "Document part not found",
      });
    }

    // Find all sections for DOCUMENT part
    const documentSections = await FormSection.find({ 
      partId: documentPart._id,
      isActive: true 
    }).sort({ order: 1 });

    const result = [];

    for (const section of documentSections) {
      // Find subsections
      const subsections = await FormSubSection.find({
        sectionId: section._id,
        isActive: true
      }).sort({ order: 1 });

      for (const subsection of subsections) {
        // Find FILE type fields
        const fields = await FormField.find({
          subSectionId: subsection._id,
          type: FieldType.FILE,
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
  } catch (error: any) {
    console.error("Get document fields error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch document fields",
    });
  }
};

// Add new document field (Admin/OPS only)
export const addDocumentField = async (req: AuthRequest, res: Response) => {
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
    const documentPart = await FormPart.findOne({ key: FormPartKey.DOCUMENT });
    if (!documentPart) {
      return res.status(404).json({
        success: false,
        message: "Document part not found",
      });
    }

    // Find "Your Documents" section
    const yourDocsSection = await FormSection.findOne({
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
    const subsection = await FormSubSection.findOne({
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
    const existingField = await FormField.findOne({
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
    const maxOrderField = await FormField.findOne({
      subSectionId: subsection._id
    }).sort({ order: -1 });

    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    // Create new field
    const newField = await FormField.create({
      subSectionId: subsection._id,
      label: documentName,
      key: documentKey,
      type: FieldType.FILE,
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
  } catch (error: any) {
    console.error("Add document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add document field",
    });
  }
};

// Delete document field (Admin only)
export const deleteDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId } = req.params;

    const field = await FormField.findById(fieldId);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: "Document field not found",
      });
    }

    // Verify it's a FILE type field
    if (field.type !== FieldType.FILE) {
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
  } catch (error: any) {
    console.error("Delete document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document field",
    });
  }
};

