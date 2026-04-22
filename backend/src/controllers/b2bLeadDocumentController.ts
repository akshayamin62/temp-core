import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth";
import B2BLeadDocument, { B2BDocumentStatus } from "../models/B2BLeadDocument";
import B2BDocumentField from "../models/B2BDocumentField";
import B2BLead from "../models/B2BLead";
import Admin from "../models/Admin";
import Advisor from "../models/Advisor";
import User from "../models/User";
import fs from "fs";
import path from "path";
import { getUploadBaseDir, ensureDir, validateFilePath } from "../utils/uploadDir";
import { sendEmail } from "../utils/email";

// ─── Document Fields ─────────────────────────────────────────────────────────

// Get document fields for a lead
export const getB2BDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const fields = await B2BDocumentField.find({ b2bLeadId: leadId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .populate("createdBy", "firstName middleName lastName email");

    return res.status(200).json({
      success: true,
      data: { fields },
    });
  } catch (error: any) {
    console.error("Get B2B document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// Add document field for a lead (B2B_OPS or SUPER_ADMIN)
export const addB2BDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, documentName, required, helpText } = req.body;

    if (!leadId || !documentName) {
      return res.status(400).json({ success: false, message: "leadId and documentName are required" });
    }

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    const documentKey = `b2b_${documentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}_${Date.now()}`;

    const maxOrderField = await B2BDocumentField.findOne({ b2bLeadId: leadId, isActive: true }).sort({ order: -1 });
    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    const newField = await B2BDocumentField.create({
      b2bLeadId: leadId,
      documentName,
      documentKey,
      required: required || false,
      helpText: helpText || undefined,
      order: nextOrder,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdByRole: req.user!.role as "SUPER_ADMIN" | "B2B_OPS",
    });

    return res.status(201).json({
      success: true,
      message: "Document field created successfully",
      data: { field: newField },
    });
  } catch (error: any) {
    console.error("Add B2B document field error:", error);
    return res.status(500).json({ success: false, message: "Failed to add document field" });
  }
};

// Delete document field (soft delete)
export const deleteB2BDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId } = req.params;

    const field = await B2BDocumentField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ success: false, message: "Document field not found" });
    }

    field.isActive = false;
    await field.save();

    return res.status(200).json({ success: true, message: "Document field deleted successfully" });
  } catch (error: any) {
    console.error("Delete B2B document field error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete document field" });
  }
};

// ─── Self-service for ADMIN / ADVISOR ────────────────────────────────────────

// Helper: resolve the b2bLeadId for the currently logged-in admin or advisor
const resolveMyLeadId = async (userId: string, role: string): Promise<string | null> => {
  if (role === "ADMIN") {
    const admin = await Admin.findOne({ userId }).select("b2bLeadId");
    return admin?.b2bLeadId?.toString() ?? null;
  }
  if (role === "ADVISOR") {
    const advisor = await Advisor.findOne({ userId }).select("b2bLeadId");
    return advisor?.b2bLeadId?.toString() ?? null;
  }
  return null;
};

// GET /my-fields – admin/advisor sees their own lead's document fields
export const getMyB2BDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const leadId = await resolveMyLeadId(req.user!.userId, req.user!.role);
    if (!leadId) {
      return res.status(200).json({ success: true, data: { fields: [] } });
    }

    const fields = await B2BDocumentField.find({ b2bLeadId: leadId, isActive: true })
      .sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields } });
  } catch (error: any) {
    console.error("Get my B2B document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /my-documents – admin/advisor sees their own lead's documents
export const getMyB2BLeadDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const leadId = await resolveMyLeadId(req.user!.userId, req.user!.role);
    if (!leadId) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    const documents = await B2BLeadDocument.find({ b2bLeadId: leadId })
      .populate("documentFieldId", "documentName documentKey required helpText")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error: any) {
    console.error("Get my B2B lead documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// ─── Documents ───────────────────────────────────────────────────────────────

// Get documents for a lead
export const getB2BLeadDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const documents = await B2BLeadDocument.find({ b2bLeadId: leadId })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .populate("documentFieldId", "documentName documentKey required helpText")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error: any) {
    console.error("Get B2B lead documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// Upload document for a lead
export const uploadB2BLeadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentKey, documentName, documentFieldId, leadId: bodyLeadId } = req.body;
    const file = req.file;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // For ADMIN/ADVISOR, auto-resolve their lead; otherwise use the provided leadId
    let resolvedLeadId = bodyLeadId;
    if (userRole === "ADMIN" || userRole === "ADVISOR") {
      const myLeadId = await resolveMyLeadId(userId, userRole);
      if (!myLeadId) {
        fs.unlinkSync(file.path);
        return res.status(403).json({ success: false, message: "No B2B lead associated with your account" });
      }
      resolvedLeadId = myLeadId;
    }

    if (!resolvedLeadId || !documentKey || !documentFieldId) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "leadId, documentKey, and documentFieldId are required" });
    }

    const lead = await B2BLead.findById(resolvedLeadId);
    if (!lead) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: "B2B Lead not found" });
    }

    // Create lead document directory
    const leadDir = path.join(getUploadBaseDir(), `b2b-lead-documents/${lead._id.toString()}`);
    ensureDir(leadDir);

    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(leadDir, finalFilename);

    fs.renameSync(file.path, finalPath);

    const documentStatus =
      userRole === "SUPER_ADMIN"
        ? B2BDocumentStatus.APPROVED
        : B2BDocumentStatus.PENDING;

    // Check for existing document for this field (replace)
    const existingDoc = await B2BLeadDocument.findOne({ b2bLeadId: lead._id, documentKey });

    let document;

    if (existingDoc) {
      const oldFilePath = path.join(process.cwd(), existingDoc.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      existingDoc.fileName = finalFilename;
      existingDoc.filePath = `uploads/b2b-lead-documents/${lead._id}/${finalFilename}`;
      existingDoc.fileSize = file.size;
      existingDoc.mimeType = file.mimetype;
      existingDoc.uploadedAt = new Date();
      existingDoc.uploadedBy = new mongoose.Types.ObjectId(userId);
      existingDoc.uploadedByRole = userRole;
      existingDoc.status = documentStatus;
      existingDoc.version += 1;
      existingDoc.approvedBy = userRole === "SUPER_ADMIN" ? new mongoose.Types.ObjectId(userId) : undefined;
      existingDoc.approvedAt = userRole === "SUPER_ADMIN" ? new Date() : undefined;
      existingDoc.rejectionMessage = undefined;
      existingDoc.rejectedBy = undefined;
      existingDoc.rejectedAt = undefined;

      document = await existingDoc.save();
    } else {
      document = await B2BLeadDocument.create({
        b2bLeadId: lead._id,
        documentFieldId: new mongoose.Types.ObjectId(documentFieldId),
        documentName,
        documentKey,
        fileName: finalFilename,
        filePath: `uploads/b2b-lead-documents/${lead._id}/${finalFilename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new mongoose.Types.ObjectId(userId),
        uploadedByRole: userRole,
        status: documentStatus,
        version: 1,
        approvedBy: userRole === "SUPER_ADMIN" ? new mongoose.Types.ObjectId(userId) : undefined,
        approvedAt: userRole === "SUPER_ADMIN" ? new Date() : undefined,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error: any) {
    console.error("Upload B2B lead document error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

// View document inline
export const viewB2BLeadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const document = await B2BLeadDocument.findById(documentId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    // ADMIN/ADVISOR can only view their own lead's documents
    if (userRole === "ADMIN" || userRole === "ADVISOR") {
      const myLeadId = await resolveMyLeadId(userId, userRole);
      if (!myLeadId || myLeadId !== document.b2bLeadId.toString()) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
    }

    const filePath = path.join(process.cwd(), document.filePath);
    const safePath = validateFilePath(filePath);
    if (!safePath) {
      res.status(403).json({ success: false, message: "Access denied: invalid file path" });
      return;
    }
    if (!fs.existsSync(safePath)) {
      res.status(404).json({ success: false, message: "File not found on server" });
      return;
    }

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);

    const fileStream = fs.createReadStream(safePath);
    fileStream.on("error", (error): void => {
      console.error("File stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to stream document" });
      }
    });
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("View B2B lead document error:", error);
    res.status(500).json({ success: false, message: "Failed to view document" });
  }
};

// Approve document (SUPER_ADMIN or B2B_OPS)
export const approveB2BLeadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await B2BLeadDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status = B2BDocumentStatus.APPROVED;
    document.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
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
  } catch (error: any) {
    console.error("Approve B2B lead document error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve document" });
  }
};

// Reject document (SUPER_ADMIN or B2B_OPS) - sets status, keeps file, sends email
export const rejectB2BLeadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { rejectionMessage } = req.body;

    if (!rejectionMessage || rejectionMessage.trim() === "") {
      return res.status(400).json({ success: false, message: "Rejection message is required" });
    }

    const document = await B2BLeadDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status = B2BDocumentStatus.REJECTED;
    document.rejectedBy = new mongoose.Types.ObjectId(req.user!.userId);
    document.rejectedAt = new Date();
    document.rejectionMessage = rejectionMessage.trim();
    document.approvedBy = undefined;
    document.approvedAt = undefined;

    await document.save();

    // Send rejection email to the uploader (admin/advisor)
    try {
      // Find the lead and the associated admin/advisor user
      const lead = await B2BLead.findById(document.b2bLeadId)
        .populate<{ createdAdminId: any }>("createdAdminId", "userId")
        .populate<{ createdAdvisorId: any }>("createdAdvisorId", "userId");

      let recipientUserId: string | undefined;
      if (lead?.createdAdminId?.userId) {
        recipientUserId = lead.createdAdminId.userId.toString();
      } else if (lead?.createdAdvisorId?.userId) {
        recipientUserId = lead.createdAdvisorId.userId.toString();
      }

      if (recipientUserId) {
        const recipientUser = await User.findById(recipientUserId).select("email firstName lastName");
        if (recipientUser?.email) {
          await sendEmail({
            to: recipientUser.email,
            subject: "Document Rejected – Action Required",
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <h2 style="color:#dc2626">Document Rejected</h2>
                <p>Hi ${recipientUser.firstName} ${recipientUser.lastName},</p>
                <p>Your document <strong>${document.documentName}</strong> has been rejected.</p>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="margin:0;font-weight:600;color:#dc2626">Reason:</p>
                  <p style="margin:8px 0 0;color:#7f1d1d">${rejectionMessage.trim()}</p>
                </div>
                <p>Please re-upload the document with the required corrections.</p>
                <p>If you have any questions, contact our support team.</p>
                <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb" />
                <p style="font-size:12px;color:#6b7280">This is an automated message. Please do not reply.</p>
              </div>
            `,
          });
        }
      }
    } catch (emailError) {
      // Don't fail the rejection if email fails
      console.error("Failed to send rejection email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Document rejected",
      data: { document },
    });
  } catch (error: any) {
    console.error("Reject B2B lead document error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject document" });
  }
};

// Delete document (SUPER_ADMIN or B2B_OPS)
export const deleteB2BLeadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await B2BLeadDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await B2BLeadDocument.findByIdAndDelete(documentId);

    return res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Delete B2B lead document error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete document" });
  }
};
