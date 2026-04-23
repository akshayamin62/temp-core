import { Response } from "express";
import { AuthRequest } from "../types/auth";
import Admin from "../models/Admin";
import Advisor from "../models/Advisor";
import B2BOps from "../models/B2BOps";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import { generateSlug, getUniqueSlug } from "./leadController";
import mongoose from "mongoose";

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
    const { companyName, address, enquiryFormSlug, mobileNumber, b2bProfileData } = req.body;

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
    if (b2bProfileData !== undefined) {
      profile.b2bProfileData = { ...(profile.b2bProfileData || {}), ...b2bProfileData };
      profile.markModified('b2bProfileData');
    }

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

/**
 * PUT /onboarding/review/:profileId/b2b-profile
 * B2B OPS or Super Admin updates the b2bProfileData fields on an Admin/Advisor profile
 */
export const updateB2BProfileByReviewer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { profileId } = req.params;
    const { b2bProfileData, role } = req.body;

    if (!role || !['Admin', 'Advisor'].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'Admin' or 'Advisor'" });
    }

    if (!b2bProfileData || typeof b2bProfileData !== 'object') {
      return res.status(400).json({ success: false, message: "b2bProfileData is required" });
    }

    const profile: any = role === 'Admin'
      ? await Admin.findById(profileId)
      : await Advisor.findById(profileId);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    profile.b2bProfileData = { ...(profile.b2bProfileData || {}), ...b2bProfileData };
    profile.markModified('b2bProfileData');
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "B2B profile data updated",
      data: profile,
    });
  } catch (error) {
    console.error("Error updating B2B profile by reviewer:", error);
    return res.status(500).json({ success: false, message: "Failed to update B2B profile data" });
  }
};
