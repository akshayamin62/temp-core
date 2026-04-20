import { Response } from "express";
import User from "../models/User";
import Student from "../models/Student";
import Admin from "../models/Admin";
import Advisor from "../models/Advisor";
import Alumni from "../models/Alumni";
import ServiceProvider from "../models/ServiceProvider";
import { USER_ROLE } from "../types/roles";
import { generateToken } from "../utils/jwt";
import { Request } from "express";
import { AuthRequest } from "../middleware/auth";
import path from "path";
import fs from "fs";
import { getUploadBaseDir } from "../utils/uploadDir";
import {
  sendOTPEmail,
} from "../utils/email";
import {
  generateOTP,
  hashOTP,
  compareOTP,
  isOTPExpired,
  getOTPExpiration,
} from "../utils/otp";
import { verifyCaptcha } from "../utils/captcha";

interface SignupRequest extends Request {
  body: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
    role: USER_ROLE;
    captchaToken: string;
    captchaAnswer: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    captchaToken: string;
    captchaAnswer: string;
  };
}

interface VerifyOTPRequest extends Request {
  body: {
    email: string;
    otp: string;
    mobileNumber?: string;
    // Service Provider fields
    companyName?: string;
    businessType?: string;
    registrationNumber?: string;
    gstNumber?: string;
    businessPan?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    website?: string;
    servicesOffered?: string;
    coachingTests?: string[];
  };
}

export const signup = async (req: SignupRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber, role, captchaToken, captchaAnswer } = req.body;

    const emailKey = email.toLowerCase().trim();

    // Verify server-side captcha
    if (!captchaToken || !captchaAnswer) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required",
      });
    }

    const answerNum = parseInt(captchaAnswer, 10);
    if (isNaN(answerNum) || !verifyCaptcha(captchaToken, answerNum)) {
      return res.status(401).json({
        success: false,
        message: "Invalid captcha. Please try again.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: emailKey });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please use a different email or try logging in.",
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const otpExpires = getOTPExpiration(10); // 10 minutes
    console.log("otp", otp);

    // Create user record
    const user = await User.create({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: emailKey,
      role,
      isVerified: false,
      isActive: true,
      otp: hashedOTP,
      otpExpires,
    });

    // Store mobile number temporarily in a custom property for later use
    if (mobileNumber) {
      (user as any).tempMobileNumber = mobileNumber.trim();
    }

    // Send OTP email - build full name from parts
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    await sendOTPEmail(user.email, fullName, otp, 'signup');

    return res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete signup.",
      data: {
        email: user.email,
        mobileNumber: mobileNumber || '',
      },
    });
  } catch (err: any) {
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    console.error("Signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Request OTP for login
export const login = async (req: LoginRequest, res: Response): Promise<Response> => {
  try {
    const { email, captchaToken, captchaAnswer } = req.body;

    const emailKey = email.toLowerCase().trim();

    // Verify server-side captcha
    if (!captchaToken || !captchaAnswer) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required",
      });
    }

    const answerNum = parseInt(captchaAnswer, 10);
    if (isNaN(answerNum) || !verifyCaptcha(captchaToken, answerNum)) {
      return res.status(401).json({
        success: false,
        message: "Invalid captcha. Please try again.",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: emailKey }).select('+otp +otpExpires');
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const otpExpires = getOTPExpiration(10); // 10 minutes
    console.log("otp", otp);

    // Save OTP to user
    user.otp = hashedOTP;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email - build full name from parts
    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
    await sendOTPEmail(user.email, fullName, otp, 'login');

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
      data: {
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Verify OTP for signup
export const verifySignupOTP = async (req: VerifyOTPRequest, res: Response): Promise<Response> => {
  try {
    const { 
      email, 
      otp, 
      mobileNumber,
      companyName,
      businessType,
      registrationNumber,
      gstNumber,
      address,
      city,
      state,
      country,
      pincode,
      website,
      servicesOffered,
      coachingTests,
      businessPan
    } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sign up first.",
      });
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (!compareOTP(otp, user.otp)) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;

    // For STUDENTS: Auto-verify and activate (no admin approval needed)
    // For ALUMNI and SERVICE_PROVIDER: Create their entries and keep isVerified = false (need admin approval)
    if (user.role === USER_ROLE.STUDENT) {
      user.isVerified = true;
      user.isActive = true;
      
      // Create Student entry with email and empty mobile number (to be filled later)
      try {
        await Student.create({
          userId: user._id,
          email: user.email, // Copy email from User to Student
          mobileNumber: "", // Will be filled when student updates profile
        });
      } catch (error) {
        console.log("Student entry creation error (might already exist):", error);
      }
    } else if (user.role === USER_ROLE.ALUMNI) {
      // Create Alumni entry with email and mobile number
      try {
        await Alumni.create({
          userId: user._id,
          email: user.email,
          mobileNumber: mobileNumber || "",
        });
      } catch (error) {
        console.log("Alumni entry creation error (might already exist):", error);
      }
    } else if (user.role === USER_ROLE.SERVICE_PROVIDER) {
      // Create ServiceProvider entry with all fields
      try {
        // Prepare servicesOffered array - include coaching tests if applicable
        let finalServicesOffered: string[] = [];
        if (servicesOffered) {
          finalServicesOffered.push(servicesOffered);
          // If Coaching Classes is selected and tests are provided, add them
          if (servicesOffered === "Coaching Classes" && coachingTests && coachingTests.length > 0) {
            finalServicesOffered = [...finalServicesOffered, ...coachingTests];
          }
        }

        await ServiceProvider.create({
          userId: user._id,
          email: user.email,
          mobileNumber: mobileNumber || "",
          companyName: companyName || "",
          businessType: businessType || "",
          registrationNumber: registrationNumber || "",
          gstNumber: gstNumber || "",
          businessPan: businessPan || "",
          address: address || "",
          city: city || "",
          state: state || "",
          country: country || "",
          pincode: pincode || "",
          website: website || "",
          servicesOffered: finalServicesOffered,
        });
      } catch (error) {
        console.log("ServiceProvider entry creation error (might already exist):", error);
      }
    }

    await user.save();

    // Generate JWT token for students (they can login immediately)
    const authToken = user.isVerified ? generateToken(user) : undefined;

    return res.status(200).json({
      success: true,
      message: user.role === USER_ROLE.STUDENT
        ? "Account created successfully! You can now access the platform."
        : "Account created successfully! Your account is pending admin approval. You will be notified once approved.",
      data: {
        ...(authToken && { token: authToken }),
        user: {
          id: user._id,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (err: any) {
    console.error("Verify signup OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Verify OTP and login
export const verifyOTP = async (req: VerifyOTPRequest, res: Response): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (!compareOTP(otp, user.otp)) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Resend OTP (for both signup and login)
export const resendOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, purpose } = req.body as { email: string; purpose?: 'signup' | 'login' };

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const emailKey = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailKey }).select('+otp +otpExpires');

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, a new OTP has been sent.",
      });
    }

    // Rate limit: check if OTP was sent less than 60 seconds ago
    if (user.otpExpires) {
      // OTP expiry is set to 10 min from creation. So creation time = otpExpires - 10min
      const otpCreatedAt = new Date(user.otpExpires.getTime() - 10 * 60 * 1000);
      const secondsSinceLastOTP = (Date.now() - otpCreatedAt.getTime()) / 1000;
      if (secondsSinceLastOTP < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastOTP);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const otpExpires = getOTPExpiration(10);
    console.log("resend otp", otp);

    user.otp = hashedOTP;
    user.otpExpires = otpExpires;
    await user.save();

    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
    await sendOTPEmail(user.email, fullName, otp, purpose || 'login');

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Get current user profile (protected route)
export const getProfile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // This will be used with authenticate middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const responseData: any = {
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    // If user is an ADMIN, include admin profile data
    if (user.role === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) {
        responseData.admin = {
          companyName: admin.companyName,
          companyLogo: admin.companyLogo,
          address: admin.address,
          enquiryFormSlug: admin.enquiryFormSlug,
          isOnboarded: admin.isOnboarded,
        };
      }
    }

    // If user is a SERVICE_PROVIDER, include SP profile data
    if (user.role === USER_ROLE.SERVICE_PROVIDER) {
      const sp = await ServiceProvider.findOne({ userId: user._id });
      if (sp) {
        responseData.serviceProvider = {
          _id: sp._id,
          companyName: sp.companyName,
          companyLogo: sp.companyLogo,
          businessType: sp.businessType,
          mobileNumber: sp.mobileNumber,
          registrationNumber: sp.registrationNumber,
          gstNumber: sp.gstNumber,
          businessPan: sp.businessPan,
          address: sp.address,
          city: sp.city,
          state: sp.state,
          country: sp.country,
          pincode: sp.pincode,
          website: sp.website,
          servicesOffered: sp.servicesOffered,
          bankName: sp.bankName,
          bankAccountNumber: sp.bankAccountNumber,
          bankIfscCode: sp.bankIfscCode,
          bankAccountType: sp.bankAccountType,
          bankSwiftCode: sp.bankSwiftCode,
          bankUpiId: sp.bankUpiId,
        };
        // Also include companyLogo and companyName in user object for easy access
        responseData.user.companyName = sp.companyName;
        responseData.user.companyLogo = sp.companyLogo;
      }
    }

    // If user is an ADVISOR, include advisor profile data
    if (user.role === USER_ROLE.ADVISOR) {
      const advisor = await Advisor.findOne({ userId: user._id });
      if (advisor) {
        responseData.advisor = {
          companyName: advisor.companyName,
          companyLogo: advisor.companyLogo,
          address: advisor.address,
          enquiryFormSlug: advisor.enquiryFormSlug,
          allowedServices: advisor.allowedServices,
          isOnboarded: advisor.isOnboarded,
        };
        responseData.user.companyName = advisor.companyName;
        responseData.user.companyLogo = advisor.companyLogo;
      }
    }

    // If user is a STUDENT, include advisor's allowedServices if applicable
    // But NOT if student has been transferred to admin (has adminId)
    if (user.role === USER_ROLE.STUDENT) {
      const student = await Student.findOne({ userId: user._id });
      if (student?.advisorId && !student.adminId) {
        const advisor = await Advisor.findById(student.advisorId);
        if (advisor) {
          responseData.allowedServices = advisor.allowedServices;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (err: any) {
    console.error("Get profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update Service Provider Profile (bank details, etc.)
 */
export const updateSPProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== USER_ROLE.SERVICE_PROVIDER) {
      return res.status(403).json({ success: false, message: "Only service providers can update SP profile" });
    }

    const allowedFields = [
      'bankName', 'bankAccountNumber', 'bankIfscCode',
      'bankAccountType', 'bankSwiftCode', 'bankUpiId',
      'companyName', 'businessType', 'registrationNumber',
      'gstNumber', 'businessPan', 'address', 'city',
      'state', 'country', 'pincode', 'website',
    ];

    const updateData: Record<string, string> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = String(req.body[field]).trim();
        if (['businessPan', 'bankIfscCode', 'bankSwiftCode'].includes(field)) {
          value = value.toUpperCase();
        }
        updateData[field] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const updated = await ServiceProvider.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Service provider profile not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { serviceProvider: updated },
    });
  } catch (err: any) {
    console.error("Update SP profile error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Upload profile picture for current user
 */
export const uploadProfilePic = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldPath = path.join(getUploadBaseDir(), 'profile-pictures', path.basename(user.profilePicture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const relativePath = `profile-pictures/${req.file.filename}`;
    user.profilePicture = relativePath;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: { profilePicture: relativePath },
    });
  } catch (err: any) {
    console.error("Upload profile picture error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Remove profile picture for current user
 */
export const removeProfilePic = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.profilePicture) {
      const filePath = path.join(getUploadBaseDir(), 'profile-pictures', path.basename(user.profilePicture));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      user.profilePicture = undefined;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
    });
  } catch (err: any) {
    console.error("Remove profile picture error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

