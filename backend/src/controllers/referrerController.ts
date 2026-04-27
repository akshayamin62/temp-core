import { Response, Request } from "express";
import { AuthRequest } from "../types/auth";
import User from "../models/User";
import Admin from "../models/Admin";
import Referrer from "../models/Referrer";
import Lead, { LEAD_STAGE, SERVICE_TYPE } from "../models/Lead";
import Student from "../models/Student";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import StudentFormAnswer from "../models/StudentFormAnswer";
import LeadStudentConversion from "../models/LeadStudentConversion";
import { USER_ROLE } from "../types/roles";
import { generateSlug } from "./leadController";
import { sendWhatsAppEnquiryWelcome, sendWhatsAppGeneralNotification } from "../utils/whatsapp";
import { sendEmail } from "../utils/email";

/**
 * Generate a unique referral slug (checks Referrer collection)
 */
const getUniqueReferralSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (await Referrer.findOne({ referralSlug: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// ============= ADMIN ENDPOINTS (manage referrers) =============

/**
 * Create a new Referrer (Admin only)
 */
export const createReferrer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber } = req.body;
    const adminUserId = req.user?.userId;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user with REFERRER role
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: true,
      isActive: true,
    });
    await newUser.save();

    // Create referrer first, then generate slug with ObjectId for guaranteed uniqueness
    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId: adminUserId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      referralSlug: 'temp', // placeholder
    });
    await newReferrer.save();

    // Generate unique referral slug: name-referrerId
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    return res.status(201).json({
      success: true,
      message: "Referrer created successfully",
      data: {
        referrer: {
          _id: newReferrer._id,
          userId: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobileNumber: newReferrer.mobileNumber,
          referralSlug: newReferrer.referralSlug,
        },
      },
    });
  } catch (error: any) {
    console.error("Create referrer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create referrer",
    });
  }
};

/**
 * Get all referrers created by the logged-in admin
 */
export const getReferrers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrers = await Referrer.find({ adminId: adminUserId })
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified")
      .sort({ createdAt: -1 });

    // Get lead counts for each referrer
    const referrerIds = referrers.map((r) => r._id);
    const leadCounts = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$referrerId", total: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    leadCounts.forEach((lc: any) => {
      countMap[lc._id.toString()] = lc.total;
    });

    return res.status(200).json({
      success: true,
      message: "Referrers fetched successfully",
      data: {
        referrers: referrers.map((r: any) => ({
          _id: r._id,
          userId: r.userId,
          email: r.email,
          mobileNumber: r.mobileNumber,
          referralSlug: r.referralSlug,
          leadCount: countMap[r._id.toString()] || 0,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get referrers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrers",
    });
  }
};

/**
 * Toggle referrer active status (Admin only)
 */
export const toggleReferrerStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await Referrer.findOne({
      _id: referrerId,
      adminId: adminUserId,
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found or unauthorized",
      });
    }

    const user = await User.findById(referrer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If user is not verified, verify & activate
    if (!user.isVerified) {
      user.isVerified = true;
      user.isActive = true;
    } else {
      user.isActive = !user.isActive;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Referrer ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: user.isActive, isVerified: user.isVerified },
    });
  } catch (error: any) {
    console.error("Toggle referrer status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle referrer status",
    });
  }
};

// ============= SUPER ADMIN ENDPOINTS =============

/**
 * Get all referrers across all admins (Super Admin)
 */
export const getAllReferrersForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const referrers = await Referrer.find()
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified")
      .populate("adminId", "firstName middleName lastName email")
      .sort({ createdAt: -1 });

    // Get companyName for each admin from Admin model
    const adminUserIds = [...new Set(referrers.map((r: any) => r.adminId?._id?.toString()).filter(Boolean))];
    const adminProfiles = await Admin.find({ userId: { $in: adminUserIds } }).select('userId companyName');
    const companyMap: Record<string, string> = {};
    adminProfiles.forEach((ap: any) => {
      companyMap[ap.userId.toString()] = ap.companyName;
    });

    const referrerIds = referrers.map((r) => r._id);
    const leadCounts = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$referrerId", total: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    leadCounts.forEach((lc: any) => {
      countMap[lc._id.toString()] = lc.total;
    });

    return res.status(200).json({
      success: true,
      message: "All referrers fetched successfully",
      data: {
        referrers: referrers.map((r: any) => ({
          _id: r._id,
          userId: r.userId,
          adminId: r.adminId,
          adminCompanyName: r.adminId ? companyMap[r.adminId._id.toString()] : undefined,
          email: r.email,
          mobileNumber: r.mobileNumber,
          referralSlug: r.referralSlug,
          leadCount: countMap[r._id.toString()] || 0,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get all referrers for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrers",
    });
  }
};

/**
 * Create a referrer under a specific admin (Super Admin)
 */
export const createReferrerForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber, adminId } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin selection is required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Verify adminId is a valid admin user
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== USER_ROLE.ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin selected",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: true,
      isActive: true,
    });
    await newUser.save();

    // Create referrer first, then generate slug with ObjectId for guaranteed uniqueness
    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      referralSlug: 'temp', // placeholder
    });
    await newReferrer.save();

    // Generate unique referral slug: name-referrerId
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    return res.status(201).json({
      success: true,
      message: "Referrer created successfully",
      data: {
        referrer: {
          _id: newReferrer._id,
          userId: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobileNumber: newReferrer.mobileNumber,
          referralSlug: newReferrer.referralSlug,
        },
      },
    });
  } catch (error: any) {
    console.error("Create referrer for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create referrer",
    });
  }
};

/**
 * Toggle referrer status (Super Admin)
 */
export const toggleReferrerStatusForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found",
      });
    }

    const user = await User.findById(referrer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If user is not verified, verify & activate
    if (!user.isVerified) {
      user.isVerified = true;
      user.isActive = true;
    } else {
      user.isActive = !user.isActive;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Referrer ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: user.isActive, isVerified: user.isVerified },
    });
  } catch (error: any) {
    console.error("Toggle referrer status for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle referrer status",
    });
  }
};

// ============= PUBLIC ENDPOINTS (referral form) =============

/**
 * PUBLIC: Get referrer + admin info for referral form
 */
export const getReferralInfo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { referralSlug } = req.params;

    const referrer = await Referrer.findOne({ referralSlug: referralSlug.toLowerCase() })
      .populate("userId", "firstName middleName lastName isActive");

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral link",
      });
    }

    const referrerUser = referrer.userId as any;
    if (!referrerUser?.isActive) {
      return res.status(410).json({
        success: false,
        message: "This referral link is no longer active",
      });
    }

    // Get admin info via referrer.adminId
    const admin = await Admin.findOne({ userId: referrer.adminId })
      .populate("userId", "firstName middleName lastName");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Associated admin not found",
      });
    }

    const adminUser = admin.userId as any;

    return res.json({
      success: true,
      data: {
        referrerName: [referrerUser?.firstName, referrerUser?.middleName, referrerUser?.lastName].filter(Boolean).join(" "),
        adminName: [adminUser?.firstName, adminUser?.middleName, adminUser?.lastName].filter(Boolean).join(" ") || "Kareer Studio",
        companyName: admin.companyName || "Kareer Studio",
        companyLogo: admin.companyLogo || null,
        services: Object.values(SERVICE_TYPE),
      },
    });
  } catch (error: any) {
    console.error("Get referral info error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load referral form",
    });
  }
};

/**
 * PUBLIC: Submit referral enquiry form
 */
export const submitReferralEnquiry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { referralSlug } = req.params;
    const { name, email, mobileNumber, city, serviceTypes, intake, year, parentDetail } = req.body;

    if (!name || !email || !mobileNumber || !city || !serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, mobileNumber, city, serviceTypes (at least one)",
      });
    }

    for (const service of serviceTypes) {
      if (!Object.values(SERVICE_TYPE).includes(service as SERVICE_TYPE)) {
        return res.status(400).json({
          success: false,
          message: `Invalid service type: ${service}`,
        });
      }
    }

    const referrer = await Referrer.findOne({ referralSlug: referralSlug.toLowerCase() })
      .populate("userId", "isActive firstName middleName lastName");
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral link",
      });
    }

    const referrerUser = referrer.userId as any;
    if (!referrerUser?.isActive) {
      return res.status(410).json({
        success: false,
        message: "This referral link is no longer active",
      });
    }

    // Duplicate check — same email + same admin within 24 hours
    const existingLead = await Lead.findOne({
      email: email.toLowerCase(),
      adminId: referrer.adminId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an enquiry recently. Please wait 24 hours before submitting again.",
      });
    }

    const newLead = new Lead({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      city: city.trim(),
      serviceTypes,
      ...(intake && { intake: intake.trim() }),
      ...(year && { year: year.trim() }),
      ...(parentDetail && parentDetail.firstName && {
        parentDetail: {
          firstName: parentDetail.firstName?.trim(),
          middleName: parentDetail.middleName?.trim() || "",
          lastName: parentDetail.lastName?.trim(),
          relationship: parentDetail.relationship?.trim(),
          mobileNumber: parentDetail.mobileNumber?.trim(),
          email: parentDetail.email?.trim().toLowerCase(),
          qualification: parentDetail.qualification?.trim(),
          occupation: parentDetail.occupation?.trim(),
        },
      }),
      adminId: referrer.adminId,
      referrerId: referrer._id,
      stage: LEAD_STAGE.NEW,
      source: "Referral",
    });

    await newLead.save();

    // WhatsApp welcome notification to lead — always send, regardless of admin lookup
    // Fetch companyName for the message, but don't let admin DB errors block this
    let companyNameForWA = 'us';
    try {
      const adminDocForWA = await Admin.findOne({ userId: referrer.adminId }).select('companyName mobileNumber email');
      companyNameForWA = adminDocForWA?.companyName || 'us';

      if (adminDocForWA) {
        const adminUser = await User.findById(referrer.adminId).select('firstName middleName lastName');
        const adminName = adminUser
          ? [adminUser.firstName, adminUser.middleName, adminUser.lastName].filter(Boolean).join(' ')
          : 'Admin';
        const serviceTypesList = (serviceTypes as string[]).join('; ');

        // WhatsApp to admin (only if mobile number is set)
        if (adminDocForWA.mobileNumber) {
          sendWhatsAppGeneralNotification(
            adminDocForWA.mobileNumber,
            adminName,
            `New referral enquiry received from ${name.trim()}.`,
            `Services: ${serviceTypesList} | City: ${city.trim()}`
          ).catch((err) => console.error('Failed to send WhatsApp referral notification to admin:', err));
        }

        // Email to admin (always, if email is present)
        if (adminDocForWA.email) {
          sendEmail({
            to: adminDocForWA.email,
            subject: `New Referral Enquiry from ${name.trim()}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a5f;">New Referral Enquiry Received</h2>
                <p>Hi ${adminName},</p>
                <p>A new enquiry has been submitted through your referrer <strong>${[referrerUser.firstName, referrerUser.middleName, referrerUser.lastName].filter(Boolean).join(' ') || 'a referrer'}</strong>'s link.</p>
                <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${name.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Email</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${email.toLowerCase().trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Mobile</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${mobileNumber.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">City</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${city.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Services</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceTypesList}</td></tr>
                </table>
                <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
              </div>
            `,
          }).catch((err) => console.error('Failed to send email to admin for referral enquiry:', err));
        }
      }
    } catch (waErr) {
      console.error('Failed to look up admin for WhatsApp/email admin notification (non-fatal):', waErr);
    }

    // Notify the referrer person about new enquiry from their link
    const referrerFullName = [referrerUser.firstName, referrerUser.middleName, referrerUser.lastName].filter(Boolean).join(' ') || 'Referrer';
    const serviceTypesListForReferrer = (serviceTypes as string[]).join('; ');

    if (referrer.mobileNumber) {
      sendWhatsAppGeneralNotification(
        referrer.mobileNumber,
        referrerFullName,
        `A new enquiry was submitted through your referral link.`,
        `${name.trim()} from ${city.trim()} is interested in: ${serviceTypesListForReferrer}`
      ).catch((err) => console.error('Failed to send WhatsApp notification to referrer person:', err));
    }

    // Email to referrer (always)
    if (referrer.email) {
      sendEmail({
        to: referrer.email,
        subject: `New Enquiry via Your Referral Link`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a5f;">New Enquiry Through Your Referral Link</h2>
            <p>Hi ${referrerFullName},</p>
            <p>Great news! Someone submitted an enquiry through your referral link.</p>
            <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${name.trim()}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">City</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${city.trim()}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Interested in</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceTypesListForReferrer}</td></tr>
            </table>
            <p>Our team will follow up with them shortly.</p>
            <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
          </div>
        `,
      }).catch((err) => console.error('Failed to send email to referrer for new enquiry:', err));
    }

    // Always send enquiry welcome WhatsApp to the lead (uses companyName if fetched, or 'us' as fallback)
    sendWhatsAppEnquiryWelcome(
      mobileNumber.trim(),
      name.trim(),
      `your request for referral with ${companyNameForWA}`
    ).catch((err) => console.error('Failed to send WhatsApp enquiry welcome to referral lead:', err));

    return res.status(201).json({
      success: true,
      message: "Thank you for your enquiry! We will contact you soon.",
    });
  } catch (error: any) {
    console.error("Submit referral enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry. Please try again later.",
    });
  }
};

// ============= REFERRER AUTH ENDPOINTS =============

/**
 * REFERRER: Get dashboard stats
 */
export const getReferrerDashboardStats = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const totalLeads = await Lead.countDocuments({ referrerId: referrer._id });
    const convertedLeads = await Lead.countDocuments({
      referrerId: referrer._id,
      stage: LEAD_STAGE.CONVERTED,
    });
    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        totalLeads,
        convertedLeads,
        totalStudents,
        referralSlug: referrer.referralSlug,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
  }
};

/**
 * REFERRER: Get referral link
 */
export const getReferralLink = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    return res.json({
      success: true,
      data: { slug: referrer.referralSlug },
    });
  } catch (error: any) {
    console.error("Get referral link error:", error);
    return res.status(500).json({ success: false, message: "Failed to get referral link" });
  }
};

/**
 * REFERRER: Get leads referred by this referrer
 */
export const getReferrerLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { stage, search } = req.query;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const filter: any = { referrerId: referrer._id };
    if (stage) filter.stage = stage;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { leads },
    });
  } catch (error: any) {
    console.error("Get referrer leads error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

/**
 * REFERRER: Get single lead detail
 */
export const getReferrerLeadDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source intake year parentDetail createdAt");

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({
      success: true,
      data: { lead },
    });
  } catch (error: any) {
    console.error("Get referrer lead detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch lead details" });
  }
};

/**
 * REFERRER: Get students converted from referrer's leads
 */
export const getReferrerStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const students = await Student.find({ referrerId: referrer._id })
      .populate("userId", "firstName middleName lastName email profilePicture isActive")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        students: students.map((s: any) => ({
          _id: s._id,
          userId: s.userId,
          email: s.email,
          mobileNumber: s.mobileNumber,
          conversionDate: s.conversionDate,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get referrer students error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * REFERRER: Get single student detail (read-only)
 */
export const getReferrerStudentDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { studentId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, referrerId: referrer._id })
      .populate("userId", "firstName middleName lastName email profilePicture isVerified isActive createdAt")
      .populate({
        path: "adminId",
        select: "companyName mobileNumber",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "counselorId",
        select: "mobileNumber",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "advisorId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or not referred by you" });
    }

    const registrations = await StudentServiceRegistration.find({ studentId })
      .populate("serviceId", "name slug shortDescription")
      .populate({
        path: "primaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "secondaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "activeOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "registeredViaAdvisorId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .populate({
        path: "registeredViaAdminId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .lean()
      .exec();

    return res.json({
      success: true,
      data: { student, registrations },
    });
  } catch (error: any) {
    console.error("Get referrer student detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student details" });
  }
};

/**
 * REFERRER: Get student by lead ID (for converted leads)
 */
export const getReferrerStudentByLeadId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    // Verify the lead belongs to this referrer
    const lead = await Lead.findOne({ _id: leadId, referrerId: referrer._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const conversion = await LeadStudentConversion.findOne({
      leadId,
      status: "APPROVED",
    });

    if (!conversion || !conversion.createdStudentId) {
      return res.status(404).json({ success: false, message: "No converted student found for this lead" });
    }

    return res.json({
      success: true,
      data: {
        student: { _id: conversion.createdStudentId },
      },
    });
  } catch (error: any) {
    console.error("Get referrer student by lead error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student" });
  }
};

/**
 * REFERRER: Get student form answers for a registration (read-only)
 */
export const getReferrerStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { studentId, registrationId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    // Verify this student belongs to this referrer
    const student = await Student.findOne({ _id: studentId, referrerId: referrer._id }).lean().exec();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or not referred by you" });
    }

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate("serviceId")
      .lean()
      .exec();

    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const answers = await StudentFormAnswer.find({ studentId }).lean().exec();

    return res.json({
      success: true,
      message: "Form answers fetched successfully",
      data: {
        registration,
        answers,
      },
    });
  } catch (error: any) {
    console.error("Get referrer student form answers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch form answers" });
  }
};

// ============= ADMIN/SA REFERRER DASHBOARD ENDPOINTS =============

/**
 * ADMIN: Get referrer dashboard (stats + leads)
 */
export const getReferrerDashboardForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId })
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt");

    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
    }

    const leads = await Lead.find({ referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    const stageCounts: Record<string, number> = {};
    Object.values(LEAD_STAGE).forEach((s) => { stageCounts[s] = 0; });
    leads.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });

    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        referrer: {
          _id: referrer._id,
          userId: referrer.userId,
          email: referrer.email,
          mobileNumber: referrer.mobileNumber,
          referralSlug: referrer.referralSlug,
          createdAt: referrer.createdAt,
        },
        leads,
        stageCounts,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard for admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch referrer dashboard" });
  }
};

/**
 * SUPER ADMIN: Get referrer dashboard (stats + leads)
 */
export const getReferrerDashboardForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;

    const referrer = await Referrer.findById(referrerId)
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt")
      .populate("adminId", "firstName middleName lastName email");

    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found" });
    }

    // Get admin company name
    const adminProfile = await Admin.findOne({ userId: (referrer.adminId as any)?._id }).select("companyName");

    const leads = await Lead.find({ referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    const stageCounts: Record<string, number> = {};
    Object.values(LEAD_STAGE).forEach((s) => { stageCounts[s] = 0; });
    leads.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });

    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        referrer: {
          _id: referrer._id,
          userId: referrer.userId,
          adminId: referrer.adminId,
          adminCompanyName: adminProfile?.companyName,
          email: referrer.email,
          mobileNumber: referrer.mobileNumber,
          referralSlug: referrer.referralSlug,
          createdAt: referrer.createdAt,
        },
        leads,
        stageCounts,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard for super admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch referrer dashboard" });
  }
};

// ============= PUBLIC REFERRER REGISTRATION =============

/**
 * PUBLIC: Get admin info for referrer registration form
 */
export const getAdminInfoForReferrerRegistration = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;

    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() })
      .populate("userId", "firstName middleName lastName");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Invalid registration link" });
    }

    const adminUser = admin.userId as any;

    return res.json({
      success: true,
      data: {
        adminName: [adminUser?.firstName, adminUser?.middleName, adminUser?.lastName].filter(Boolean).join(" ") || "Kareer Studio",
        companyName: admin.companyName || "Kareer Studio",
        companyLogo: admin.companyLogo || null,
      },
    });
  } catch (error: any) {
    console.error("Get admin info for referrer registration error:", error);
    return res.status(500).json({ success: false, message: "Failed to load registration form" });
  }
};

/**
 * PUBLIC: Register as a referrer (inactive + unverified until admin approves)
 */
export const registerAsReferrer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;
    const { firstName, middleName, lastName, email, mobileNumber } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Invalid registration link" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Create user as UNVERIFIED + INACTIVE
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: false,
      isActive: false,
    });
    await newUser.save();

    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId: admin.userId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      referralSlug: "temp",
    });
    await newReferrer.save();

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    // Notify admin of new referrer registration
    try {
      const adminName = await User.findById(admin.userId).select('firstName middleName lastName');
      const adminDisplayName = adminName
        ? [adminName.firstName, adminName.middleName, adminName.lastName].filter(Boolean).join(' ')
        : 'Admin';
      const referrerName = [firstName, middleName, lastName].filter(Boolean).join(' ');

      if (admin.mobileNumber) {
        sendWhatsAppGeneralNotification(
          admin.mobileNumber,
          adminDisplayName,
          `New referrer registration from ${referrerName}.`,
          `Email: ${email.toLowerCase().trim()} | Mobile: ${mobileNumber.trim()} | Status: Pending Approval`
        ).catch((err) => console.error('Failed to send WhatsApp to admin for new referrer registration:', err));
      }

      if (admin.email) {
        sendEmail({
          to: admin.email,
          subject: `New Referrer Registration – ${referrerName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e3a5f;">New Referrer Registration</h2>
              <p>Hi ${adminDisplayName},</p>
              <p>A new person has registered to become a referrer on your platform. Their account is currently <strong>pending your approval</strong>.</p>
              <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${referrerName}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Email</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${email.toLowerCase().trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Mobile</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${mobileNumber.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Status</td><td style="padding: 8px; border: 1px solid #e0e0e0;">Pending Approval</td></tr>
              </table>
              <p>Please log in to your dashboard to review and approve this registration.</p>
              <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
            </div>
          `,
        }).catch((err) => console.error('Failed to send email to admin for new referrer registration:', err));
      }
    } catch (notifyErr) {
      console.error('Failed to notify admin of new referrer registration (non-fatal):', notifyErr);
    }

    // Welcome notification to the new referrer
    try {
      const referrerName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      if (mobileNumber?.trim()) {
        sendWhatsAppGeneralNotification(
          mobileNumber.trim(),
          referrerName,
          `Your referrer registration has been submitted successfully.`,
          `Your account is pending approval. You will be notified once approved`
        ).catch((err) => console.error('Failed to send WhatsApp welcome to new referrer:', err));
      }
      sendEmail({
        to: email.toLowerCase().trim(),
        subject: `Your Referrer Registration – Pending Approval`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a5f;">Registration Submitted Successfully</h2>
            <p>Hi ${referrerName},</p>
            <p>Thank you for registering as a referrer. Your application has been submitted and is currently <strong>pending approval</strong> by the admin.</p>
            <p>Once your account is approved, you will receive your unique referral link that you can share to earn commissions.</p>
            <p>If you have any questions, please contact the admin directly.</p>
            <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
          </div>
        `,
      }).catch((err) => console.error('Failed to send welcome email to new referrer:', err));
    } catch (notifyErr) {
      console.error('Failed to send welcome notification to new referrer (non-fatal):', notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: "Registration submitted successfully! Your account is pending approval.",
    });
  } catch (error: any) {
    console.error("Register as referrer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit registration. Please try again later.",
    });
  }
};
