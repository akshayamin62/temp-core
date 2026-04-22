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

// Default document fields to seed for each new admin/advisor
const DEFAULT_DOCUMENT_FIELDS = [
  // Section 2: Business Registration
  { documentName: "Registration Certificate", documentKey: "registration_certificate", section: "Business Registration", helpText: "Company/business registration certificate", required: true, order: 1 },
  { documentName: "GST Registration Certificate", documentKey: "gst_certificate", section: "Business Registration", helpText: "GST registration certificate (if applicable)", required: false, order: 2 },
  { documentName: "Shop & Establishment License", documentKey: "shop_establishment_license", section: "Business Registration", helpText: "If applicable", required: false, order: 3 },
  { documentName: "Partnership Deed", documentKey: "partnership_deed", section: "Business Registration", helpText: "If applicable (Partnership firms)", required: false, order: 4 },
  // Section 3: Tax & Financial
  { documentName: "PAN Card (Company)", documentKey: "pan_card_company", section: "Tax & Financial", helpText: "Company PAN card", required: true, order: 5 },
  { documentName: "Cancelled Cheque / Bank Proof", documentKey: "cancelled_cheque", section: "Tax & Financial", helpText: "Cancelled cheque or bank statement as proof", required: true, order: 6 },
  { documentName: "Latest ITR", documentKey: "latest_itr", section: "Tax & Financial", helpText: "Latest Income Tax Return (optional but recommended)", required: false, order: 7 },
  // Section 7: KYC Documents
  { documentName: "Aadhaar Card", documentKey: "aadhaar_card", section: "KYC Documents", helpText: "Individual / Authorized Signatory Aadhaar card", required: true, order: 8 },
  { documentName: "PAN Card (Individual)", documentKey: "pan_card_individual", section: "KYC Documents", helpText: "Individual PAN card", required: true, order: 9 },
  { documentName: "Passport-size Photograph", documentKey: "passport_photo", section: "KYC Documents", helpText: "Recent passport-size photograph", required: true, order: 10 },
  { documentName: "Address Proof", documentKey: "address_proof", section: "KYC Documents", helpText: "Electricity bill / Rent agreement / Bank statement", required: true, order: 11 },
  // Section 8: Authorized Signatory
  { documentName: "ID Proof (Authorized Person)", documentKey: "auth_id_proof", section: "Authorized Signatory", helpText: "ID proof of the authorized signatory", required: true, order: 12 },
  { documentName: "Board Resolution / Authorization Letter", documentKey: "board_resolution", section: "Authorized Signatory", helpText: "Board resolution or authorization letter", required: true, order: 13 },
  { documentName: "Digital Signature (DSC)", documentKey: "digital_signature", section: "Authorized Signatory", helpText: "Digital Signature Certificate (if required for contracts)", required: false, order: 14 },
];

// Helper: resolve adminId or advisorId for the logged-in user
const resolveMyEntityId = async (
  userId: string,
  role: string
): Promise<{ entityId: mongoose.Types.ObjectId; entityType: "admin" | "advisor"; b2bLeadId: mongoose.Types.ObjectId | null } | null> => {
  if (role === "ADMIN") {
    const admin = await Admin.findOne({ userId }).select("_id b2bLeadId");
    if (!admin) return null;
    return { entityId: admin._id as mongoose.Types.ObjectId, entityType: "admin", b2bLeadId: (admin.b2bLeadId as mongoose.Types.ObjectId) ?? null };
  }
  if (role === "ADVISOR") {
    const advisor = await Advisor.findOne({ userId }).select("_id b2bLeadId");
    if (!advisor) return null;
    return { entityId: advisor._id as mongoose.Types.ObjectId, entityType: "advisor", b2bLeadId: (advisor.b2bLeadId as mongoose.Types.ObjectId) ?? null };
  }
  return null;
};

// Helper: resolve the b2bLeadId for the currently logged-in admin or advisor (kept for backward compat)
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

// POST /seed-defaults – seed default document fields for admin/advisor
export const seedDefaultDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const entity = await resolveMyEntityId(req.user!.userId, req.user!.role);
    if (!entity) {
      return res.status(403).json({ success: false, message: "Admin/Advisor profile not found" });
    }

    const entityFilter = entity.entityType === "admin"
      ? { adminId: entity.entityId }
      : { advisorId: entity.entityId };

    // Check how many fields already exist
    const existingKeys = await B2BDocumentField.find({ ...entityFilter, isActive: true }).distinct("documentKey");
    const existingKeySet = new Set(existingKeys);

    const toCreate = DEFAULT_DOCUMENT_FIELDS.filter(f => !existingKeySet.has(f.documentKey));

    if (toCreate.length > 0) {
      const docs = toCreate.map(f => ({
        ...entityFilter,
        b2bLeadId: entity.b2bLeadId ?? undefined,
        documentName: f.documentName,
        documentKey: f.documentKey,
        section: f.section,
        required: f.required,
        helpText: f.helpText,
        order: f.order,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(req.user!.userId),
        createdByRole: "SYSTEM" as const,
      }));
      await B2BDocumentField.insertMany(docs);
    }

    const allFields = await B2BDocumentField.find({ ...entityFilter, isActive: true }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields: allFields, seeded: toCreate.length } });
  } catch (error: any) {
    console.error("Seed default document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to seed default document fields" });
  }
};

// GET /my-fields – admin/advisor sees their own document fields
export const getMyB2BDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const entity = await resolveMyEntityId(req.user!.userId, req.user!.role);
    if (!entity) {
      return res.status(200).json({ success: true, data: { fields: [] } });
    }

    const entityFilter = entity.entityType === "admin"
      ? { adminId: entity.entityId }
      : { advisorId: entity.entityId };

    const fields = await B2BDocumentField.find({ ...entityFilter, isActive: true })
      .sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields } });
  } catch (error: any) {
    console.error("Get my B2B document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /my-documents – admin/advisor sees their own uploaded documents
export const getMyB2BLeadDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const entity = await resolveMyEntityId(req.user!.userId, req.user!.role);
    if (!entity) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    const entityFilter = entity.entityType === "admin"
      ? { adminId: entity.entityId }
      : { advisorId: entity.entityId };

    const documents = await B2BLeadDocument.find(entityFilter)
      .populate("documentFieldId", "documentName documentKey required helpText section")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error: any) {
    console.error("Get my B2B lead documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// GET /fields/by-admin/:adminId – b2b-ops/super-admin fetch fields for a specific admin
export const getDocumentFieldsByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const fields = await B2BDocumentField.find({ adminId: new mongoose.Types.ObjectId(adminId), isActive: true })
      .sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: { fields } });
  } catch (error: any) {
    console.error("Get admin document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /fields/by-advisor/:advisorId – b2b-ops/super-admin fetch fields for a specific advisor
export const getDocumentFieldsByAdvisor = async (req: AuthRequest, res: Response) => {
  try {
    const { advisorId } = req.params;
    const fields = await B2BDocumentField.find({ advisorId: new mongoose.Types.ObjectId(advisorId), isActive: true })
      .sort({ order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: { fields } });
  } catch (error: any) {
    console.error("Get advisor document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /by-admin/:adminId – b2b-ops/super-admin fetch documents for a specific admin
export const getDocumentsByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const documents = await B2BLeadDocument.find({ adminId: new mongoose.Types.ObjectId(adminId) })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .populate("documentFieldId", "documentName documentKey required helpText section")
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: { documents } });
  } catch (error: any) {
    console.error("Get admin documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// GET /by-advisor/:advisorId – b2b-ops/super-admin fetch documents for a specific advisor
export const getDocumentsByAdvisor = async (req: AuthRequest, res: Response) => {
  try {
    const { advisorId } = req.params;
    const documents = await B2BLeadDocument.find({ advisorId: new mongoose.Types.ObjectId(advisorId) })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .populate("documentFieldId", "documentName documentKey required helpText section")
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: { documents } });
  } catch (error: any) {
    console.error("Get advisor documents error:", error);
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

    if (!documentKey || !documentFieldId) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "documentKey and documentFieldId are required" });
    }

    let storeDir: string;
    let filePath: string;
    let adminIdRef: mongoose.Types.ObjectId | undefined;
    let advisorIdRef: mongoose.Types.ObjectId | undefined;
    let b2bLeadIdRef: mongoose.Types.ObjectId | undefined;

    if (userRole === "ADMIN" || userRole === "ADVISOR") {
      // Admin/Advisor: store by their own ID
      const entity = await resolveMyEntityId(userId, userRole);
      if (!entity) {
        fs.unlinkSync(file.path);
        return res.status(403).json({ success: false, message: "Admin/Advisor profile not found" });
      }

      if (entity.entityType === "admin") {
        adminIdRef = entity.entityId;
        storeDir = path.join(getUploadBaseDir(), `b2b-lead-documents/admin-${entity.entityId.toString()}`);
        filePath = `uploads/b2b-lead-documents/admin-${entity.entityId.toString()}`;
      } else {
        advisorIdRef = entity.entityId;
        storeDir = path.join(getUploadBaseDir(), `b2b-lead-documents/advisor-${entity.entityId.toString()}`);
        filePath = `uploads/b2b-lead-documents/advisor-${entity.entityId.toString()}`;
      }
      if (entity.b2bLeadId) b2bLeadIdRef = entity.b2bLeadId;
    } else {
      // SUPER_ADMIN / B2B_OPS: use provided leadId
      if (!bodyLeadId) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, message: "leadId is required" });
      }
      const lead = await B2BLead.findById(bodyLeadId);
      if (!lead) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ success: false, message: "B2B Lead not found" });
      }
      b2bLeadIdRef = lead._id as mongoose.Types.ObjectId;
      storeDir = path.join(getUploadBaseDir(), `b2b-lead-documents/${lead._id.toString()}`);
      filePath = `uploads/b2b-lead-documents/${lead._id.toString()}`;
    }

    ensureDir(storeDir);

    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(storeDir, finalFilename);

    fs.renameSync(file.path, finalPath);

    const documentStatus =
      userRole === "SUPER_ADMIN"
        ? B2BDocumentStatus.APPROVED
        : B2BDocumentStatus.PENDING;

    // Build entity filter for lookup
    const lookupFilter: Record<string, any> = adminIdRef
      ? { adminId: adminIdRef, documentKey }
      : advisorIdRef
      ? { advisorId: advisorIdRef, documentKey }
      : { b2bLeadId: b2bLeadIdRef, documentKey };

    const existingDoc = await B2BLeadDocument.findOne(lookupFilter);

    let document;

    if (existingDoc) {
      const oldFilePath = path.join(process.cwd(), existingDoc.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      existingDoc.fileName = finalFilename;
      existingDoc.filePath = `${filePath}/${finalFilename}`;
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
        b2bLeadId: b2bLeadIdRef ?? undefined,
        adminId: adminIdRef ?? undefined,
        advisorId: advisorIdRef ?? undefined,
        documentFieldId: new mongoose.Types.ObjectId(documentFieldId),
        documentName,
        documentKey,
        fileName: finalFilename,
        filePath: `${filePath}/${finalFilename}`,
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

    // ADMIN/ADVISOR can only view their own documents
    if (userRole === "ADMIN" || userRole === "ADVISOR") {
      const entity = await resolveMyEntityId(userId, userRole);
      if (!entity) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      const hasAccess = entity.entityType === "admin"
        ? document.adminId?.toString() === entity.entityId.toString()
        : document.advisorId?.toString() === entity.entityId.toString();

      if (!hasAccess) {
        // Fallback: check b2bLeadId for older documents
        const myLeadId = await resolveMyLeadId(userId, userRole);
        if (!myLeadId || myLeadId !== document.b2bLeadId?.toString()) {
          res.status(403).json({ success: false, message: "Access denied" });
          return;
        }
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
