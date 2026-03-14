import { Response } from "express";
import { AuthRequest } from "../types/auth";
import DocumentField from "../models/DocumentField";

// Get all document fields
export const getDocumentFields = async (_req: AuthRequest, res: Response) => {
  try {
    const fields = await DocumentField.find({ isActive: true }).sort({ order: 1 });

    const result = fields.map(f => ({
      _id: f._id,
      documentKey: f.documentKey,
      documentName: f.documentName,
      category: f.category,
      required: f.required,
      helpText: f.helpText,
      order: f.order,
    }));

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

    if (!['PRIMARY', 'SECONDARY'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Category must be PRIMARY or SECONDARY",
      });
    }

    const documentKey = documentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const existingField = await DocumentField.findOne({ documentKey });
    if (existingField) {
      return res.status(400).json({
        success: false,
        message: "A document field with this name already exists",
      });
    }

    const maxOrderField = await DocumentField.findOne().sort({ order: -1 });
    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    const newField = await DocumentField.create({
      documentName,
      documentKey,
      category,
      required: required || false,
      helpText: helpText || undefined,
      order: nextOrder,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Document field created successfully",
      data: {
        field: {
          _id: newField._id,
          documentKey: newField.documentKey,
          documentName: newField.documentName,
          category: newField.category,
          required: newField.required,
          helpText: newField.helpText,
          order: newField.order,
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

    const field = await DocumentField.findById(fieldId);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: "Document field not found",
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

