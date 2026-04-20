import { Response } from "express";
import { AuthRequest } from "../types/auth";
import Admin from "../models/Admin";
import Advisor from "../models/Advisor";
import B2BOps from "../models/B2BOps";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import { generateSlug, getUniqueSlug } from "./leadController";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { getUploadBaseDir, ensureDir, validateFilePath } from "../utils/uploadDir";

/**
 * Helper: get the Admin or Advisor profile for a user
 */
const getProfileByRole = async (userId: string, role: string): Promise<any> => {
  if (role === USER_ROLE.ADMIN) return Admin.findOne({ userId });
  if (role === USER_ROLE.ADVISOR) return Advisor.findOne({ userId });
  return null;
};

// ========================= ADMIN/ADVISOR ONBOARDING =========================

/**
 * GET /onboarding/profile
 * Admin/Advisor gets their onboarding profile data
 */
export const getOnboardingProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let profile: any = null;
    if (role === USER_ROLE.ADMIN) {
      profile = await Admin.findOne({ userId })
        .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type")
        .populate("assignedB2BOpsId", "userId");
    } else if (role === USER_ROLE.ADVISOR) {
      profile = await Advisor.findOne({ userId })
        .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type")
        .populate("assignedB2BOpsId", "userId");
    } else {
      return res.status(403).json({ success: false, message: "Only Admin/Advisor can access onboarding" });
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    return res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    console.error("Error fetching onboarding profile:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch onboarding profile" });
  }
};

/**
 * PUT /onboarding/profile
 * Admin/Advisor updates their company details during onboarding
 */
export const updateOnboardingProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { companyName, address, enquiryFormSlug, mobileNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const Model = role === USER_ROLE.ADMIN ? Admin : role === USER_ROLE.ADVISOR ? Advisor : null;
    if (!Model) {
      return res.status(403).json({ success: false, message: "Only Admin/Advisor can update onboarding" });
    }

    const profile: any = await getProfileByRole(userId, role!);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (profile.isOnboarded) {
      return res.status(400).json({ success: false, message: "Onboarding is already complete" });
    }

    // Update fields
    if (companyName !== undefined) profile.companyName = companyName.trim();
    if (address !== undefined) profile.address = address.trim();
    if (mobileNumber !== undefined) profile.mobileNumber = mobileNumber.trim();

    // Handle slug
    if (enquiryFormSlug !== undefined) {
      const baseSlug = generateSlug(enquiryFormSlug || companyName || "company");
      // Check if this slug is already taken by someone else
      const existingAdmin = await Admin.findOne({ enquiryFormSlug: baseSlug, _id: { $ne: profile._id } });
      const existingAdvisor = await Advisor.findOne({ enquiryFormSlug: baseSlug, _id: { $ne: profile._id } });
      if (existingAdmin || existingAdvisor) {
        profile.enquiryFormSlug = await getUniqueSlug(baseSlug);
      } else {
        profile.enquiryFormSlug = baseSlug;
      }
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Onboarding profile updated",
      data: profile,
    });
  } catch (error) {
    console.error("Error updating onboarding profile:", error);
    return res.status(500).json({ success: false, message: "Failed to update onboarding profile" });
  }
};

/**
 * POST /onboarding/upload-document
 * Admin/Advisor uploads a document (aadhar, pan, etc.)
 */
export const uploadOnboardingDocument = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { documentType } = req.body;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!documentType) {
      return res.status(400).json({ success: false, message: "Document type is required" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const Model = role === USER_ROLE.ADMIN ? Admin : role === USER_ROLE.ADVISOR ? Advisor : null;
    if (!Model) {
      return res.status(403).json({ success: false, message: "Only Admin/Advisor can upload documents" });
    }

    const profile: any = await getProfileByRole(userId, role!);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (profile.isOnboarded) {
      return res.status(400).json({ success: false, message: "Onboarding is already complete" });
    }

    // Move file from temp to organized directory (admin/[id]/ or advisor/[id]/)
    const roleFolder = role === USER_ROLE.ADMIN ? "admin" : "advisor";
    const profileDir = path.join(getUploadBaseDir(), roleFolder, profile._id.toString());
    ensureDir(profileDir);
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalFilename = `${documentType}_${Date.now()}_${sanitizedName}`;
    const finalPath = path.join(profileDir, finalFilename);

    // Delete old file if re-uploading
    const existingDocIndex = profile.documents.findIndex((doc: any) => doc.type === documentType);
    if (existingDocIndex >= 0) {
      const oldUrl = profile.documents[existingDocIndex].url;
      if (oldUrl) {
        const oldFilePath = path.join(process.cwd(), oldUrl);
        try { if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); } catch {}
      }
    }

    // Move temp file to final location
    fs.renameSync(file.path, finalPath);

    // Store relative path
    const relativePath = path.relative(process.cwd(), finalPath).replace(/\\/g, "/");

    const docEntry = {
      type: documentType,
      url: relativePath,
      status: "PENDING" as const,
      rejectReason: undefined,
      fileName: file.originalname,
      mimeType: file.mimetype,
    };

    if (existingDocIndex >= 0) {
      profile.documents[existingDocIndex] = docEntry;
    } else {
      profile.documents.push(docEntry);
    }

    // Reset onboardingSubmittedAt if re-uploading after rejection
    if (profile.onboardingSubmittedAt) {
      profile.onboardingSubmittedAt = undefined;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `${documentType} document uploaded successfully`,
      data: profile,
    });
  } catch (error) {
    console.error("Error uploading onboarding document:", error);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

/**
 * POST /onboarding/submit
 * Admin/Advisor submits onboarding for review
 */
export const submitOnboarding = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const Model = role === USER_ROLE.ADMIN ? Admin : role === USER_ROLE.ADVISOR ? Advisor : null;
    if (!Model) {
      return res.status(403).json({ success: false, message: "Only Admin/Advisor can submit onboarding" });
    }

    const profile: any = await getProfileByRole(userId, role!);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (profile.isOnboarded) {
      return res.status(400).json({ success: false, message: "Onboarding is already complete" });
    }

    // Validate required fields
    if (!profile.companyName) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    // Validate required documents are uploaded
    const requiredDocTypes = ["aadhar", "pan"];
    const uploadedDocTypes = profile.documents.map((doc: any) => doc.type);
    const missingDocs = requiredDocTypes.filter((t) => !uploadedDocTypes.includes(t));
    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missingDocs.join(", ")}`,
      });
    }

    profile.onboardingSubmittedAt = new Date();
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Onboarding submitted for review",
      data: profile,
    });
  } catch (error) {
    console.error("Error submitting onboarding:", error);
    return res.status(500).json({ success: false, message: "Failed to submit onboarding" });
  }
};

// ========================= OPS / SUPER ADMIN REVIEW =========================

/**
 * GET /b2b/onboarding/:profileId
 * OPS/Super Admin views an Admin/Advisor's onboarding profile
 * profileId can be Admin or Advisor _id
 */
export const getOnboardingReview = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { profileId } = req.params;
    const { role: profileRole } = req.query; // "Admin" or "Advisor"

    let profile: any = null;
    if (profileRole === "Advisor") {
      profile = await Advisor.findById(profileId)
        .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
        .populate("assignedB2BOpsId", "userId");
    } else {
      profile = await Admin.findById(profileId)
        .populate("b2bLeadId", "firstName middleName lastName email mobileNumber type stage")
        .populate("assignedB2BOpsId", "userId");
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // Populate the user for name info
    const user = await User.findById(profile.userId).select("firstName middleName lastName email").lean();

    return res.status(200).json({
      success: true,
      data: { profile, user },
    });
  } catch (error) {
    console.error("Error fetching onboarding review:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch onboarding data" });
  }
};

/**
 * POST /b2b/onboarding/:profileId/review-document
 * OPS/Super Admin approves or rejects a specific document
 */
export const reviewOnboardingDocument = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { profileId } = req.params;
    const { documentType, action, rejectReason, role: profileRole } = req.body;

    if (!documentType || !action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "documentType and action (approve/reject) are required",
      });
    }

    if (action === "reject" && !rejectReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const profile: any = profileRole === "Advisor"
      ? await Advisor.findById(profileId)
      : await Admin.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const docIndex = profile.documents.findIndex((doc: any) => doc.type === documentType);
    if (docIndex < 0) {
      return res.status(404).json({ success: false, message: `Document '${documentType}' not found` });
    }

    if (action === "approve") {
      profile.documents[docIndex].status = "APPROVED";
      profile.documents[docIndex].rejectReason = undefined;
    } else {
      profile.documents[docIndex].status = "REJECTED";
      profile.documents[docIndex].rejectReason = rejectReason;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Document ${documentType} ${action}d`,
      data: profile,
    });
  } catch (error) {
    console.error("Error reviewing document:", error);
    return res.status(500).json({ success: false, message: "Failed to review document" });
  }
};

// ========================= OPS ASSIGNMENT =========================

/**
 * POST /b2b/admin-advisor/:id/assign-ops
 * Super Admin assigns a B2B OPS to an Admin/Advisor account
 */
export const assignOpsToProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { opsId, role: profileRole } = req.body;

    if (!opsId) {
      return res.status(400).json({ success: false, message: "OPS ID is required" });
    }

    // Verify OPS exists
    const ops = await B2BOps.findById(opsId);
    if (!ops) {
      return res.status(404).json({ success: false, message: "B2B OPS not found" });
    }

    const profile: any = profileRole === "Advisor"
      ? await Advisor.findById(id)
      : await Admin.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    profile.assignedB2BOpsId = new mongoose.Types.ObjectId(opsId);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "B2B OPS assigned to profile",
      data: profile,
    });
  } catch (error) {
    console.error("Error assigning OPS:", error);
    return res.status(500).json({ success: false, message: "Failed to assign OPS" });
  }
};

// ========================= DOCUMENT VIEW =========================

/**
 * GET /onboarding/document/:profileId/:documentType/view
 * View an onboarding document inline (streams file)
 */
export const viewOnboardingDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { profileId, documentType } = req.params;
    const { role: profileRole } = req.query;

    const profile: any = profileRole === "Advisor"
      ? await Advisor.findById(profileId)
      : await Admin.findById(profileId);

    if (!profile) {
      res.status(404).json({ success: false, message: "Profile not found" });
      return;
    }

    // Verify access: owner, B2B_OPS, or SUPER_ADMIN
    const userRole = req.user!.role;
    const userId = req.user!.userId;
    if (userRole !== USER_ROLE.SUPER_ADMIN && userRole !== USER_ROLE.B2B_OPS) {
      if (profile.userId.toString() !== userId) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
    }

    const doc = profile.documents.find((d: any) => d.type === documentType);
    if (!doc || !doc.url) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    const filePath = path.join(process.cwd(), doc.url);
    const safePath = validateFilePath(filePath);
    if (!safePath) {
      res.status(403).json({ success: false, message: "Access denied: invalid file path" });
      return;
    }
    if (!fs.existsSync(safePath)) {
      res.status(404).json({ success: false, message: "File not found on server" });
      return;
    }

    const mimeType = doc.mimeType || "application/octet-stream";
    const fileName = doc.fileName || `${documentType}.pdf`;

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    const fileStream = fs.createReadStream(safePath);
    fileStream.on("error", (error): void => {
      console.warn("File stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to stream document" });
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    console.warn("View onboarding document error:", error);
    res.status(500).json({ success: false, message: "Failed to view document" });
  }
};

// ========================= OPS/SA DOCUMENT UPLOAD =========================

/**
 * POST /onboarding/review/:profileId/upload-document
 * B2B OPS or Super Admin uploads a document for an Admin/Advisor profile
 */
export const uploadOnboardingDocumentByReviewer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { profileId } = req.params;
    const { documentType, role: profileRole } = req.body;
    const file = req.file;

    if (!documentType) {
      return res.status(400).json({ success: false, message: "Document type is required" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const profile: any = profileRole === "Advisor"
      ? await Advisor.findById(profileId)
      : await Admin.findById(profileId);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // Move file from temp to organized directory (admin/[id]/ or advisor/[id]/)
    const roleFolder = profileRole === "Advisor" ? "advisor" : "admin";
    const profileDir = path.join(getUploadBaseDir(), roleFolder, profile._id.toString());
    ensureDir(profileDir);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalFilename = `${documentType}_${Date.now()}_${sanitizedName}`;
    const finalPath = path.join(profileDir, finalFilename);

    // Delete old file if re-uploading
    const existingDocIndex = profile.documents.findIndex((doc: any) => doc.type === documentType);
    if (existingDocIndex >= 0) {
      const oldUrl = profile.documents[existingDocIndex].url;
      if (oldUrl) {
        const oldFilePath = path.join(process.cwd(), oldUrl);
        try { if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); } catch {}
      }
    }

    // Move temp file to final location
    fs.renameSync(file.path, finalPath);

    const relativePath = path.relative(process.cwd(), finalPath).replace(/\\/g, "/");

    // OPS/SA uploads are auto-approved
    const docEntry = {
      type: documentType,
      url: relativePath,
      status: "APPROVED" as const,
      rejectReason: undefined,
      fileName: file.originalname,
      mimeType: file.mimetype,
    };

    if (existingDocIndex >= 0) {
      profile.documents[existingDocIndex] = docEntry;
    } else {
      profile.documents.push(docEntry);
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `${documentType} document uploaded and auto-approved`,
      data: profile,
    });
  } catch (error) {
    console.error("Error uploading document by reviewer:", error);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

/**
 * PUT /onboarding/review/:profileId/company-details
 * OPS/Super Admin can update company details (companyName, address) on a profile
 */
export const updateCompanyDetailsByReviewer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { profileId } = req.params;
    const { companyName, address, role } = req.body;

    if (!role || !['Admin', 'Advisor'].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'Admin' or 'Advisor'" });
    }

    let profile: any;
    if (role === 'Admin') {
      profile = await Admin.findById(profileId);
    } else {
      profile = await Advisor.findById(profileId);
    }
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (companyName !== undefined) profile.companyName = companyName.trim();
    if (address !== undefined) profile.address = address.trim();

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Company details updated",
      data: profile,
    });
  } catch (error) {
    console.error("Error updating company details by reviewer:", error);
    return res.status(500).json({ success: false, message: "Failed to update company details" });
  }
};
