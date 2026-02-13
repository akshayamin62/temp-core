import { Request, Response } from "express";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import Ops from "../models/Ops";
import IvyExpert from "../models/IvyExpert";
import EduplanCoach from "../models/EduplanCoach";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
import Lead, { LEAD_STAGE } from "../models/Lead";
import Student from "../models/Student";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import TeamMeet from "../models/TeamMeet";
import LeadStudentConversion from "../models/LeadStudentConversion";
import FollowUp, { FOLLOWUP_STATUS } from "../models/FollowUp";
import { generateSlug, getUniqueSlug } from "./leadController";
// import { sendEmail } from "../utils/email";

/**
 * Get all users with optional filters
 */
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role, isVerified, isActive, search } = req.query;

    // Build filter object
    const filter: any = {};

    if (role) {
      // Normalize role to uppercase to match enum values
      // Handle query param which can be string, array, or ParsedQs
      let roleStr: string;
      if (Array.isArray(role)) {
        roleStr = String(role[0]);
      } else if (typeof role === 'string') {
        roleStr = role;
      } else {
        roleStr = String(role);
      }
      const normalizedRole = roleStr.toUpperCase().replace(/\s+/g, '_');
      filter.role = normalizedRole;
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === "true";
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    // If filtering by ADMIN role or no role filter, include admin profile data
    let enrichedUsers = users;
    if (!role || (role && String(role).toUpperCase() === 'ADMIN')) {
      enrichedUsers = await Promise.all(
        users.map(async (user: any) => {
          const userObj = user.toObject();
          if (userObj.role === USER_ROLE.ADMIN) {
            const adminProfile = await Admin.findOne({ userId: user._id }).select('companyName companyLogo');
            if (adminProfile) {
              userObj.companyName = adminProfile.companyName;
              userObj.companyLogo = adminProfile.companyLogo;
            }
          }
          return userObj;
        })
      );
    }

    // If filtering by COUNSELOR role, include admin company name
    if (role && String(role).toUpperCase() === 'COUNSELOR') {
      enrichedUsers = await Promise.all(
        users.map(async (user: any) => {
          const userObj = user.toObject();
          if (userObj.role === USER_ROLE.COUNSELOR) {
            const counselorProfile = await Counselor.findOne({ userId: user._id });
            if (counselorProfile) {
              const adminProfile = await Admin.findOne({ userId: counselorProfile.adminId }).select('companyName');
              if (adminProfile) {
                userObj.companyName = adminProfile.companyName;
              }
            }
          }
          return userObj;
        })
      );

      // If there's a search query, additionally filter by company name
      if (search) {
        const searchLower = String(search).toLowerCase();
        enrichedUsers = enrichedUsers.filter((user: any) => 
          (user.firstName || '').toLowerCase().includes(searchLower) ||
          (user.lastName || '').toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.companyName && user.companyName.toLowerCase().includes(searchLower))
        );
      }
    }

    return res.json({
      success: true,
      data: {
        users: enrichedUsers,
        count: enrichedUsers.length,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingApproval = await User.countDocuments({
      isVerified: false,
      role: { $nin: [USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT] }, // Unverified users except admins and students
    });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      success: true,
      data: {
        total: totalUsers,
        verified: verifiedUsers,
        active: activeUsers,
        pendingApproval,
        byRole: roleStats,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
    });
  }
};

/**
 * Approve user (for OPS, alumni, service provider)
 */
export const approveUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent approving admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve admin users",
      });
    }

    // Students don't need admin approval (they're auto-approved after email verification)
    if (user.role === USER_ROLE.STUDENT) {
      return res.status(400).json({
        success: false,
        message: "Students are automatically approved after email verification",
      });
    }

    // Check if user is already verified/approved
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already approved",
      });
    }

    // Approve user: set isVerified and isActive to true (automatic activation)
    user.isVerified = true;
    user.isActive = true;
    await user.save();

    // Send approval email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Account Approved - Community Platform",
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: #2563eb;">Account Approved! 🎉</h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Great news! Your account has been approved by our admin team.</p>
    //         <p>You can now access all features of the Community Platform.</p>
    //         <p><strong>Role:</strong> ${user.role}</p>
    //         <div style="margin: 30px 0;">
    //           <a href="${process.env.FRONTEND_URL}/login" 
    //              style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    //             Login to Your Account
    //           </a>
    //         </div>
    //         <p>If you have any questions, feel free to contact our support team.</p>
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending approval email:", emailError);
    //   // Continue even if email fails
    // }

    return res.json({
      success: true,
      message: "User approved successfully",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error approving user",
    });
  }
};

/**
 * Reject user approval
 */
export const rejectUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;
    // const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send rejection email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Account Application Update - Community Platform",
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: #dc2626;">Account Application Update</h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Thank you for your interest in joining the Community Platform as a ${user.role}.</p>
    //         <p>After careful review, we are unable to approve your application at this time.</p>
    //         ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
    //         <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending rejection email:", emailError);
    // }

    // Delete the user
    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: "User rejected and removed successfully",
    });
  } catch (error) {
    console.error("Reject user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error rejecting user",
    });
  }
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deactivating admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate admin users",
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    // // Send notification email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: `Account ${user.isActive ? "Activated" : "Deactivated"} - Community Platform`,
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: ${user.isActive ? "#16a34a" : "#dc2626"};">
    //           Account ${user.isActive ? "Activated" : "Deactivated"}
    //         </h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Your account has been ${user.isActive ? "activated" : "deactivated"} by an administrator.</p>
    //         ${
    //           user.isActive
    //             ? '<p>You can now log in and access all platform features.</p>'
    //             : '<p>Your access has been temporarily suspended. Please contact support if you have questions.</p>'
    //         }
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending status notification email:", emailError);
    // }

    return res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating user status",
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting user",
    });
  }
};

/**
 * Get pending approvals
 */
export const getPendingApprovals = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const pendingUsers = await User.find({
      isVerified: false,
      role: { $nin: [USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT] }, // Unverified users except admins and students
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        users: pendingUsers,
        count: pendingUsers.length,
      },
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending approvals",
    });
  }
};

/**
 * Create a new ops (admin only)
 */
export const createOps = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, phoneNumber } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create ops user
    const opsUser = await User.create({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.OPS,
      isVerified: true, // Auto-verify ops created by admin
      isActive: true,
    });

    // Create ops record
    const OpsModel = (await import("../models/Ops")).default;
    const ops = await OpsModel.create({
      userId: opsUser._id,
      email: email.toLowerCase().trim(),
      mobileNumber: phoneNumber?.trim() || undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Ops created successfully",
      data: {
        ops: {
          id: opsUser._id,
          firstName: opsUser.firstName,
          middleName: opsUser.middleName,
          lastName: opsUser.lastName,
          email: ops.email,
          mobileNumber: ops.mobileNumber,
          role: opsUser.role,
          isVerified: opsUser.isVerified,
          isActive: opsUser.isActive,
        },
      },
    });
  } catch (error: any) {
    console.error("Create ops error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error creating ops",
      error: error.message,
    });
  }
};

/**
 * Get all ops
 */
export const getAllOps = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const ops = await Ops.find()
      .populate('userId', 'firstName middleName lastName email isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Ops fetched successfully',
      data: {
        ops: ops.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get ops error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ops',
      error: error.message,
    });
  }
};

/**
 * Get all Ivy Experts
 */
export const getAllIvyExperts = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const ivyExperts = await IvyExpert.find()
      .populate('userId', 'firstName middleName lastName email isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Ivy Experts fetched successfully',
      data: {
        ivyExperts: ivyExperts.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get ivy experts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ivy experts',
      error: error.message,
    });
  }
};

/**
 * Get all Eduplan Coaches
 */
export const getAllEduplanCoaches = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const eduplanCoaches = await EduplanCoach.find()
      .populate('userId', 'firstName middleName lastName email isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Eduplan Coaches fetched successfully',
      data: {
        eduplanCoaches: eduplanCoaches.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get eduplan coaches error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch eduplan coaches',
      error: error.message,
    });
  }
};

/**
 * Create a new Admin
 */
export const createAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, firstName, middleName, lastName, email, phoneNumber } = req.body;

    // Support both old name field and new firstName/lastName fields
    const resolvedFirstName = firstName || (name ? name.trim().split(/\s+/)[0] : '');
    const resolvedLastName = lastName || (name ? name.trim().split(/\s+/).slice(1).join(' ') || name.trim().split(/\s+/)[0] : '');

    // Validation
    if ((!resolvedFirstName || !resolvedLastName) || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with ADMIN role (no password - will use OTP login)
    const newUser = new User({
      firstName: resolvedFirstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: resolvedLastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.ADMIN,
      isVerified: true, // Auto-verify admins created by super admin
      isActive: true,
    });

    await newUser.save();

    // Create Admin profile
    const newAdmin = new Admin({
      userId: newUser._id,
      email: email.toLowerCase().trim(),
      mobileNumber: phoneNumber?.trim() || undefined,
    });

    await newAdmin.save();

    // TODO: Send email with credentials
    // await sendEmail({
    //   to: email,
    //   subject: 'Admin Account Created',
    //   text: `Your admin account has been created. Email: ${email}, Password: ${defaultPassword}`,
    // });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          _id: newAdmin._id,
          userId: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobileNumber: newAdmin.mobileNumber,
        },
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message,
    });
  }
};

/**
 * Get all admins for dropdown selection
 */
export const getAdmins = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const admins = await User.find({ role: USER_ROLE.ADMIN, isActive: true })
      .select('_id firstName middleName lastName email')
      .sort({ lastName: 1 });

    return res.status(200).json({
      success: true,
      data: {
        admins: admins.map((admin: any) => ({
          _id: admin._id,
          firstName: admin.firstName,
          middleName: admin.middleName,
          lastName: admin.lastName,
          email: admin.email,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get admins error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: error.message,
    });
  }
};

/**
 * Get admin details by admin user ID
 */
export const getAdminDetails = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;

    const user = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    const adminProfile = await Admin.findOne({ userId: adminId });
    if (!adminProfile) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        mobileNumber: adminProfile.mobileNumber,
        companyName: adminProfile.companyName,
        address: adminProfile.address,
        companyLogo: adminProfile.companyLogo,
        enquiryFormSlug: adminProfile.enquiryFormSlug,
      },
    });
  } catch (error: any) {
    console.error('Get admin details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin details',
      error: error.message,
    });
  }
};

/**
 * Create a new User by Role (generic function for all roles)
 * This allows Super Admin to create users with any role
 */
export const createUserByRole = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, phoneNumber, role, adminId, customSlug, companyName, address } = req.body;
    const companyLogo = (req as any).file ? `/uploads/admin/${(req as any).file.filename}` : undefined;

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and role are required',
      });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please use only numbers and allowed characters (+, -, (), spaces)',
      });
    }

    // For ADMIN role, companyName is required
    if (role === USER_ROLE.ADMIN && !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for Admin creation',
      });
    }

    // Validate role is allowed
    const allowedRoles = [
      USER_ROLE.ADMIN,
      USER_ROLE.OPS,
      USER_ROLE.EDUPLAN_COACH,
      USER_ROLE.IVY_EXPERT,
      USER_ROLE.COUNSELOR,
    ];

    if (!allowedRoles.includes(role as USER_ROLE)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role or role does not allow direct creation',
      });
    }

    // For COUNSELOR role, adminId is required
    if (role === USER_ROLE.COUNSELOR && !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin selection is required for creating a Counselor',
      });
    }

    // Validate adminId if provided for COUNSELOR
    if (role === USER_ROLE.COUNSELOR && adminId) {
      const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin selected',
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with specified role (no password - will use OTP login)
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: role,
      isVerified: true, // Auto-verify users created by super admin
      isActive: true,
    });

    await newUser.save();

    let enquiryFormSlug: string | undefined;

    // If creating ADMIN role, also create Admin profile with slug
    if (role === USER_ROLE.ADMIN) {
      // Generate slug from company name, falling back to custom slug or full name
      let baseSlug: string;
      if (customSlug) {
        baseSlug = generateSlug(customSlug);
      } else if (companyName) {
        baseSlug = generateSlug(companyName);
      } else {
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
        baseSlug = generateSlug(fullName);
      }
      enquiryFormSlug = await getUniqueSlug(baseSlug);

      const newAdmin = new Admin({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
        companyName: companyName.trim(),
        address: address?.trim() || undefined,
        companyLogo: companyLogo || undefined,
        enquiryFormSlug: enquiryFormSlug,
      });
      await newAdmin.save();
    }

    // If creating OPS role, also create Ops profile (for Study Abroad service)
    if (role === USER_ROLE.OPS) {
      const newOps = new Ops({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newOps.save();
    }

    // If creating IVY_EXPERT role, create IvyExpert profile (for Ivy League service)
    if (role === USER_ROLE.IVY_EXPERT) {
      const newIvyExpert = new IvyExpert({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newIvyExpert.save();
    }

    // If creating EDUPLAN_COACH role, create EduplanCoach profile (for Education Planning service)
    if (role === USER_ROLE.EDUPLAN_COACH) {
      const newEduplanCoach = new EduplanCoach({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newEduplanCoach.save();
    }

    // If creating COUNSELOR role, also create Counselor profile with adminId
    if (role === USER_ROLE.COUNSELOR) {
      const newCounselor = new Counselor({
        userId: newUser._id,
        adminId: adminId,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newCounselor.save();
    }

    return res.status(201).json({
      success: true,
      message: `${role.replace(/_/g, ' ')} created successfully. They can log in using OTP.`,
      data: {
        user: {
          _id: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
        enquiryFormSlug: enquiryFormSlug, // Include slug for ADMIN role
      },
    });
  } catch (error: any) {
    console.error('Create user by role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

/**
 * Get admin dashboard stats (for super admin to view a specific admin's dashboard)
 */
export const getAdminDashboardStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;

    // Verify admin exists
    const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const adminProfile = await Admin.findOne({ userId: adminId });
    if (!adminProfile) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }

    // Get counselor count
    const totalCounselors = await Counselor.countDocuments({ adminId: adminId });

    // Get lead stats
    const allLeads = await Lead.find({ adminId: adminId });
    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length;

    // Get student count
    const totalStudents = await Student.countDocuments({ adminId: adminProfile._id });

    // Enquiry form URL
    const enquiryFormUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/enquiry/${adminProfile.enquiryFormSlug}`;

    return res.status(200).json({
      success: true,
      data: {
        totalCounselors,
        totalLeads,
        newLeads,
        totalStudents,
        enquiryFormUrl,
        enquiryFormSlug: adminProfile.enquiryFormSlug,
        admin: {
          _id: adminUser._id,
          firstName: adminUser.firstName,
          middleName: adminUser.middleName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          isActive: adminUser.isActive,
          isVerified: adminUser.isVerified,
          companyName: adminProfile.companyName,
          companyLogo: adminProfile.companyLogo,
          address: adminProfile.address,
          mobileNumber: adminProfile.mobileNumber,
        },
      },
    });
  } catch (error: any) {
    console.error('Get admin dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard stats', error: error.message });
  }
};

/**
 * Get counselors under a specific admin (for super admin)
 */
export const getAdminCounselorsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;

    const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const counselors = await Counselor.find({ adminId: adminId })
      .populate('userId', 'firstName middleName lastName name email isActive isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        counselors: counselors.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get admin counselors error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin counselors', error: error.message });
  }
};

/**
 * Get leads under a specific admin (for super admin)
 */
export const getAdminLeadsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;
    const { stage, serviceTypes, assigned, search } = req.query;

    const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Build filter
    const filter: any = { adminId: adminId };

    if (stage) filter.stage = stage;
    if (serviceTypes) filter.serviceTypes = { $in: [serviceTypes] };
    if (assigned === "true") filter.assignedCounselorId = { $ne: null };
    else if (assigned === "false") filter.assignedCounselorId = null;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .populate({
        path: "assignedCounselorId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .sort({ createdAt: -1 });

    // Get stats
    const allLeads = await Lead.find({ adminId: adminId });
    const stats = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length,
      hot: allLeads.filter((l) => l.stage === LEAD_STAGE.HOT).length,
      warm: allLeads.filter((l) => l.stage === LEAD_STAGE.WARM).length,
      cold: allLeads.filter((l) => l.stage === LEAD_STAGE.COLD).length,
      converted: allLeads.filter((l) => l.stage === LEAD_STAGE.CONVERTED).length,
      closed: allLeads.filter((l) => l.stage === LEAD_STAGE.CLOSED).length,
      unassigned: allLeads.filter((l) => !l.assignedCounselorId).length,
    };

    return res.status(200).json({
      success: true,
      data: { leads, stats },
    });
  } catch (error: any) {
    console.error('Get admin leads error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin leads', error: error.message });
  }
};

/**
 * Get students under a specific admin (for super admin)
 */
export const getAdminStudentsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;

    const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const adminProfile = await Admin.findOne({ userId: adminId });
    if (!adminProfile) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }

    const students = await Student.find({ adminId: adminProfile._id })
      .populate('userId', 'firstName middleName lastName email isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .populate({
        path: 'counselorId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .sort({ createdAt: -1 });

    // Get registration count and conversion info for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student: any) => {
        const registrations = await StudentServiceRegistration.find({
          studentId: student._id,
        }).populate('serviceId', 'name');

        const serviceNames = registrations
          .map((r: any) => r.serviceId?.name)
          .filter(Boolean);

        // Check for conversion info
        const conversion = await LeadStudentConversion.findOne({
          studentId: student.userId?._id,
        }).populate('leadId', 'name email mobileNumber');

        return {
          _id: student._id,
          user: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          counselorId: student.counselorId,
          registrationCount: registrations.length,
          serviceNames,
          createdAt: student.createdAt,
          convertedFromLead: conversion?.leadId || null,
        };
      })
    );

    // Calculate stats
    const activeStudents = studentsWithStats.filter((s: any) => s.user?.isActive).length;

    return res.status(200).json({
      success: true,
      data: {
        students: studentsWithStats,
        stats: {
          total: studentsWithStats.length,
          active: activeStudents,
        },
      },
    });
  } catch (error: any) {
    console.error('Get admin students error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin students', error: error.message });
  }
};

/**
 * Get team meets for a specific admin (for super admin - read only)
 */
export const getAdminTeamMeetsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId } = req.params;
    const { month, year } = req.query;

    const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    let startDate: Date;
    let endDate: Date;

    if (month && year) {
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      startDate = new Date(yearNum, monthNum - 1, -6);
      endDate = new Date(yearNum, monthNum, 7, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }

    const teamMeets = await TeamMeet.find({
      $or: [{ requestedBy: adminId }, { requestedTo: adminId }],
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .populate("requestedBy", "firstName middleName lastName email role")
      .populate("requestedTo", "firstName middleName lastName email role")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      data: { teamMeets },
    });
  } catch (error: any) {
    console.error('Get admin team meets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin team meets', error: error.message });
  }
};

// ============= ALL LEADS FOR SUPER ADMIN =============

/**
 * Get all leads across all admins (for super admin)
 */
export const getAllLeadsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { stage, search, serviceTypes, assigned } = req.query;

    const filter: any = {};

    if (stage) filter.stage = stage;
    if (serviceTypes) filter.serviceTypes = { $in: [serviceTypes] };
    if (assigned === "true") filter.assignedCounselorId = { $ne: null };
    else if (assigned === "false") filter.assignedCounselorId = null;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .populate({
        path: "assignedCounselorId",
        populate: { path: "userId", select: "firstName middleName lastName email" }
      })
      .populate("adminId", "firstName middleName lastName email")
      .sort({ createdAt: -1 });

    // Get admin companyNames for all unique adminIds
    const adminUserIds = [...new Set(leads.map((l: any) => l.adminId?._id?.toString()).filter(Boolean))];
    const admins = await Admin.find({ userId: { $in: adminUserIds } }).select("userId companyName");
    const adminCompanyMap: Record<string, string> = {};
    admins.forEach((a: any) => {
      adminCompanyMap[a.userId.toString()] = a.companyName;
    });

    // Attach companyName to each lead's adminId
    const leadsWithCompany = leads.map((lead: any) => {
      const leadObj = lead.toObject();
      if (leadObj.adminId?._id) {
        leadObj.adminId.companyName = adminCompanyMap[leadObj.adminId._id.toString()] || null;
      }
      return leadObj;
    });

    // Get stats from all leads (ignoring filters)
    const allLeads = await Lead.find({});
    const stats = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length,
      hot: allLeads.filter((l) => l.stage === LEAD_STAGE.HOT).length,
      warm: allLeads.filter((l) => l.stage === LEAD_STAGE.WARM).length,
      cold: allLeads.filter((l) => l.stage === LEAD_STAGE.COLD).length,
      converted: allLeads.filter((l) => l.stage === LEAD_STAGE.CONVERTED).length,
      closed: allLeads.filter((l) => l.stage === LEAD_STAGE.CLOSED).length,
      unassigned: allLeads.filter((l) => !l.assignedCounselorId).length,
    };

    return res.status(200).json({
      success: true,
      data: { leads: leadsWithCompany, stats },
    });
  } catch (error: any) {
    console.error('Get all leads for super admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leads', error: error.message });
  }
};

// ============= COUNSELOR DASHBOARD FOR SUPER ADMIN =============

/**
 * Get counselor detail with dashboard data (for super admin)
 */
export const getCounselorDetailForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { counselorId } = req.params;

    // Find counselor by _id first, then fallback to userId
    let counselor = await Counselor.findById(counselorId)
      .populate('userId', 'firstName middleName lastName name email isActive isVerified');

    if (!counselor) {
      counselor = await Counselor.findOne({ userId: counselorId })
        .populate('userId', 'firstName middleName lastName name email isActive isVerified');
    }

    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }

    // Get counselor's leads
    const leads = await Lead.find({
      assignedCounselorId: counselor._id,
    }).sort({ createdAt: -1 });

    // Get admin's enquiry form slug via counselor's adminId
    const admin = await Admin.findOne({ userId: counselor.adminId });

    return res.status(200).json({
      success: true,
      data: {
        counselor: {
          _id: counselor._id,
          userId: counselor.userId,
          email: counselor.email,
          mobileNumber: counselor.mobileNumber,
          adminId: counselor.adminId,
          createdAt: counselor.createdAt,
        },
        leads,
        enquirySlug: admin?.enquiryFormSlug || '',
      },
    });
  } catch (error: any) {
    console.error('Get counselor detail for super admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch counselor detail', error: error.message });
  }
};

/**
 * Get counselor's follow-ups (for super admin)
 */
export const getCounselorFollowUpsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { counselorId } = req.params;

    // Verify counselor exists (try _id first, then userId)
    let counselor = await Counselor.findById(counselorId);
    if (!counselor) {
      counselor = await Counselor.findOne({ userId: counselorId });
    }
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }

    const followUps = await FollowUp.find({ counselorId: counselor._id })
      .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({ success: true, data: { followUps } });
  } catch (error: any) {
    console.error('Get counselor follow-ups for super admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch counselor follow-ups', error: error.message });
  }
};

/**
 * Get counselor's follow-up summary (for super admin)
 */
export const getCounselorFollowUpSummaryForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { counselorId } = req.params;

    let counselor = await Counselor.findById(counselorId);
    if (!counselor) {
      counselor = await Counselor.findOne({ userId: counselorId });
    }
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }

    const actualCounselorId = counselor._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayFollowUps, missedFollowUps, upcomingFollowUps] = await Promise.all([
      FollowUp.find({
        counselorId: actualCounselorId,
        scheduledDate: { $gte: today, $lt: tomorrow },
      })
        .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
        .sort({ scheduledTime: 1 }),
      FollowUp.find({
        counselorId: actualCounselorId,
        scheduledDate: { $lt: today },
        status: FOLLOWUP_STATUS.SCHEDULED,
      })
        .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
        .sort({ scheduledDate: -1 }),
      FollowUp.find({
        counselorId: actualCounselorId,
        scheduledDate: { $gt: tomorrow },
        status: FOLLOWUP_STATUS.SCHEDULED,
      })
        .populate('leadId', 'name email mobileNumber city serviceTypes stage conversionStatus')
        .sort({ scheduledDate: 1, scheduledTime: 1 })
        .limit(10),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        today: todayFollowUps,
        missed: missedFollowUps,
        upcoming: upcomingFollowUps,
        counts: {
          today: todayFollowUps.length,
          missed: missedFollowUps.length,
          upcoming: upcomingFollowUps.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Get counselor follow-up summary for super admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch follow-up summary', error: error.message });
  }
};

/**
 * Get counselor's team meets (for super admin)
 */
export const getCounselorTeamMeetsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { counselorId } = req.params;

    let counselor = await Counselor.findById(counselorId)
      .populate('userId', '_id');
    if (!counselor) {
      counselor = await Counselor.findOne({ userId: counselorId })
        .populate('userId', '_id');
    }
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }

    const counselorUserId = (counselor.userId as any)?._id;

    const teamMeets = await TeamMeet.find({
      $or: [{ requestedBy: counselorUserId }, { requestedTo: counselorUserId }],
    })
      .populate('requestedBy', 'firstName middleName lastName email role')
      .populate('requestedTo', 'firstName middleName lastName email role')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({ success: true, data: { teamMeets } });
  } catch (error: any) {
    console.error('Get counselor team meets for super admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch counselor team meets', error: error.message });
  }
};

// ============= OPS DASHBOARD ROUTES (Read-Only for Super Admin) =============

/**
 * Get ops user details by userId
 */
export const getOpsDetailForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { opsUserId } = req.params;

    const opsUser = await User.findById(opsUserId).select('-password');
    if (!opsUser || opsUser.role !== USER_ROLE.OPS) {
      return res.status(404).json({ success: false, message: 'OPS user not found' });
    }

    const opsRecord = await Ops.findOne({ userId: opsUserId });
    if (!opsRecord) {
      return res.status(404).json({ success: false, message: 'OPS record not found' });
    }

    return res.json({
      success: true,
      data: {
        user: opsUser,
        ops: opsRecord,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ops details', error: error.message });
  }
};

/**
 * Get schedules for a specific ops user (Super Admin read-only)
 */
export const getOpsSchedulesForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { opsUserId } = req.params;

    const opsRecord = await Ops.findOne({ userId: opsUserId });
    if (!opsRecord) {
      return res.status(404).json({ success: false, message: 'OPS record not found' });
    }

    const OpsSchedule = (await import('../models/OpsSchedule')).default;

    const schedules = await OpsSchedule.find({ opsId: opsRecord._id })
      .populate({
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email',
        },
      })
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.json({
      success: true,
      data: { schedules },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ops schedules', error: error.message });
  }
};

/**
 * Get schedule summary for a specific ops user (Super Admin read-only)
 */
export const getOpsScheduleSummaryForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { opsUserId } = req.params;

    const opsRecord = await Ops.findOne({ userId: opsUserId });
    if (!opsRecord) {
      return res.status(404).json({ success: false, message: 'OPS record not found' });
    }

    const OpsSchedule = (await import('../models/OpsSchedule')).default;
    const { OPS_SCHEDULE_STATUS } = await import('../models/OpsSchedule');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const populateOpts = {
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'firstName middleName lastName email',
      },
    };

    const today = await OpsSchedule.find({
      opsId: opsRecord._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    }).populate(populateOpts).sort({ scheduledTime: 1 });

    const missed = await OpsSchedule.find({
      opsId: opsRecord._id,
      scheduledDate: { $lt: todayStart },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    }).populate(populateOpts).sort({ scheduledDate: -1, scheduledTime: -1 }).limit(10);

    const tomorrow = await OpsSchedule.find({
      opsId: opsRecord._id,
      scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    }).populate(populateOpts).sort({ scheduledTime: 1 });

    const counts = {
      today: today.length,
      missed: missed.length,
      tomorrow: tomorrow.length,
      total: await OpsSchedule.countDocuments({
        opsId: opsRecord._id,
        status: OPS_SCHEDULE_STATUS.SCHEDULED,
      }),
    };

    return res.json({
      success: true,
      data: { today, missed, tomorrow, counts },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ops schedule summary', error: error.message });
  }
};

/**
 * Get students assigned to a specific ops user (Super Admin read-only)
 */
export const getOpsStudentsForSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { opsUserId } = req.params;

    const opsRecord = await Ops.findOne({ userId: opsUserId });
    if (!opsRecord) {
      return res.status(404).json({ success: false, message: 'OPS record not found' });
    }

    const StudentServiceRegistration = (await import('../models/StudentServiceRegistration')).default;
    const Student = (await import('../models/Student')).default;

    const registrationDocs = await StudentServiceRegistration.find({
      activeOpsId: opsRecord._id,
    });

    const studentIds = [...new Set(registrationDocs.map(r => r.studentId.toString()))];

    const students = await Student.find({
      _id: { $in: studentIds },
    })
      .populate({
        path: 'userId',
        select: 'firstName middleName lastName email isActive isVerified createdAt',
      })
      .populate({
        path: 'adminId',
        select: 'companyName',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email',
        },
      });

    // Enrich with service names
    const studentsWithServices = await Promise.all(
      students.map(async (student: any) => {
        const regs = await StudentServiceRegistration.find({
          studentId: student._id,
        }).populate('serviceId', 'name');

        const serviceNames = regs
          .map((r: any) => r.serviceId?.name)
          .filter(Boolean);

        return {
          _id: student._id,
          userId: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          registrationCount: regs.length,
          serviceNames,
          createdAt: student.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      data: { students: studentsWithServices },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ops students', error: error.message });
  }
};
