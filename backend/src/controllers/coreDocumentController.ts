import { Response } from "express";
import { AuthRequest } from "../types/auth";
import COREDocumentField, { COREDocumentType } from "../models/COREDocumentField";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import Student from "../models/Student";
import User from "../models/User";
import mongoose from "mongoose";
import { sendWhatsAppGeneralNotification } from "../utils/whatsapp";
import { sendEmail } from "../utils/email";

// Get CORE document fields for a specific student
export const getCOREDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;
    const { type } = req.query; // 'CORE' | 'EXTRA' | undefined

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Build query with optional type filter
    const query: any = {
      studentId: registration.studentId,
      registrationId,
      isActive: true,
    };

    // Filter by documentType if provided
    if (type && Object.values(COREDocumentType).includes(type as COREDocumentType)) {
      query.documentType = type;
    }

    // Get CORE document fields for this student
    const fields = await COREDocumentField.find(query)
      .sort({ order: 1, createdAt: 1 })
      .populate("createdBy", "firstName middleName lastName email");

    return res.status(200).json({
      success: true,
      data: { fields },
    });
  } catch (error: any) {
    console.error("Get CORE document fields error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CORE document fields",
    });
  }
};

// Add new CORE document field for a specific student (Admin/OPS only)
export const addCOREDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, documentName, category, required, helpText, allowMultiple, documentType } = req.body;

    if (!registrationId || !documentName) {
      return res.status(400).json({
        success: false,
        message: "Registration ID and document name are required",
      });
    }

    // Validate documentType if provided
    const validDocType = documentType && Object.values(COREDocumentType).includes(documentType)
      ? documentType
      : COREDocumentType.CORE;

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Generate document key from name with type prefix
    const prefix = validDocType === COREDocumentType.EXTRA ? "extra" : "core";
    const documentKey = `${prefix}_${documentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}_${Date.now()}`;

    // Get max order for this student's documents of same type
    const maxOrderField = await COREDocumentField.findOne({
      studentId: registration.studentId,
      registrationId,
      documentType: validDocType,
    }).sort({ order: -1 });

    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    // Create new CORE document field
    const newField = await COREDocumentField.create({
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
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdByRole: req.user!.role as "SUPER_ADMIN" | "OPS",
    });

    // Send WhatsApp + email notification to student
    try {
      const studentDoc = await Student.findById(registration.studentId).lean() as any;
      const studentUserDoc = studentDoc?.userId
        ? await User.findById(studentDoc.userId).select('firstName middleName lastName email mobileNumber').lean() as any
        : null;
      const studentName = studentUserDoc
        ? [studentUserDoc.firstName, studentUserDoc.middleName, studentUserDoc.lastName].filter(Boolean).join(' ')
        : 'Student';
      const studentMobile = studentDoc?.mobileNumber || studentUserDoc?.mobileNumber;
      const studentEmail = studentDoc?.email || studentUserDoc?.email;

      // Fetch the acting user's (OPS/Super Admin) name
      const actingUserDoc = await User.findById(req.user!.userId).select('firstName middleName lastName').lean() as any;
      const actingUserName = actingUserDoc
        ? [actingUserDoc.firstName, actingUserDoc.middleName, actingUserDoc.lastName].filter(Boolean).join(' ')
        : req.user!.role;
      const actingRoleLabel = req.user!.role === 'SUPER_ADMIN' ? 'Super Admin' : 'OPS';
      const actingUserBold = `*${actingUserName} (${actingRoleLabel})*`;

      const isUploadRequest = validDocType === COREDocumentType.EXTRA;

      const line2 = isUploadRequest
        ? `${actingUserBold} has requested a new document upload: *${documentName}*.`
        : `${actingUserBold} has shared a new document with you: *${documentName}*.`;
      const line3 = isUploadRequest
        ? 'Please log in to your dashboard and upload it at the earliest'
        : 'Log in to your dashboard to view and download the document';

      if (studentMobile) {
        await sendWhatsAppGeneralNotification(studentMobile, studentName, line2, line3);
      }

      if (studentEmail) {
        const emailSubject = isUploadRequest
          ? `Document Upload Requested: ${documentName}`
          : `New Document Shared: ${documentName}`;
        const emailBody = isUploadRequest
          ? `<p>Hi ${studentName},</p>
<p><strong>${actingUserName} (${actingRoleLabel})</strong> has requested you to upload a new document:</p>
<p>📄 <strong>${documentName}</strong></p>
<p>Please log in to your dashboard and upload it at the earliest:</p>
<p><a href="https://core.admitra.io/dashboard">https://core.admitra.io/dashboard</a></p>
<p>Best regards,<br/>ADMITra Team</p>`
          : `<p>Hi ${studentName},</p>
<p><strong>${actingUserName} (${actingRoleLabel})</strong> has shared a new document with you:</p>
<p>📄 <strong>${documentName}</strong></p>
<p>Log in to your dashboard to view and download the document:</p>
<p><a href="https://core.admitra.io/dashboard">https://core.admitra.io/dashboard</a></p>
<p>Best regards,<br/>ADMITra Team</p>`;
        await sendEmail({ to: studentEmail, subject: emailSubject, html: emailBody });
      }
    } catch (notifErr) {
      console.error('[COREDocument Notif] Failed to send notification:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "CORE document field created successfully",
      data: { field: newField },
    });
  } catch (error: any) {
    console.error("Add CORE document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add CORE document field",
    });
  }
};

// Delete CORE document field (Admin/OPS only)
export const deleteCOREDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId } = req.params;

    const field = await COREDocumentField.findById(fieldId);
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
  } catch (error: any) {
    console.error("Delete CORE document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete CORE document field",
    });
  }
};

