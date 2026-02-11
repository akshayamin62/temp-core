import { Response } from "express";
import User from "../models/User";
import Student from "../models/Student";
import Admin from "../models/Admin";
import { USER_ROLE } from "../types/roles";
import { generateToken } from "../utils/jwt";
import { Request } from "express";
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

interface SignupRequest extends Request {
  body: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: USER_ROLE;
    captcha: string;
    captchaInput: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    captcha: string;
    captchaInput: string;
  };
}

interface VerifyOTPRequest extends Request {
  body: {
    email: string;
    otp: string;
  };
}

export const signup = async (req: SignupRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, role, captcha, captchaInput } = req.body;

    const emailKey = email.toLowerCase().trim();

    // Verify captcha (comparing hashed values)
    if (!captcha || !captchaInput) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required",
      });
    }

    if (captcha !== captchaInput) {
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

    // Generate 4-digit OTP
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
      isActive: false,
      otp: hashedOTP,
      otpExpires,
    });

    // Send OTP email - build full name from parts
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    await sendOTPEmail(user.email, fullName, otp, 'signup');

    return res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete signup.",
      data: {
        email: user.email,
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
    const { email, captcha, captchaInput } = req.body;

    const emailKey = email.toLowerCase().trim();

    // Verify captcha (comparing hashed values)
    if (!captcha || !captchaInput) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required",
      });
    }

    if (captcha !== captchaInput) {
      return res.status(401).json({
        success: false,
        message: "Invalid captcha. Please try again.",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: emailKey });
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Check if account is fully verified (admin approved if needed)
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending verification. You will be notified via email once approved.",
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
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
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
    // For OTHERS: Keep isVerified = false (need admin approval)
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
    const user = await User.findOne({ email: email.toLowerCase() });
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

    // Check if account is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending verification. You will be notified via email once approved.",
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
        };
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


