"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.verifyOTP = exports.verifySignupOTP = exports.login = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Admin_1 = __importDefault(require("../models/Admin"));
const roles_1 = require("../types/roles");
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const otp_1 = require("../utils/otp");
const signup = async (req, res) => {
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
        const existingUser = await User_1.default.findOne({ email: emailKey });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered. Please use a different email or try logging in.",
            });
        }
        // Generate 4-digit OTP
        const otp = (0, otp_1.generateOTP)();
        const hashedOTP = (0, otp_1.hashOTP)(otp);
        const otpExpires = (0, otp_1.getOTPExpiration)(10); // 10 minutes
        console.log("otp", otp);
        // Create user record
        const user = await User_1.default.create({
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
        await (0, email_1.sendOTPEmail)(user.email, fullName, otp, 'signup');
        return res.status(201).json({
            success: true,
            message: "OTP sent to your email. Please verify to complete signup.",
            data: {
                email: user.email,
            },
        });
    }
    catch (err) {
        // Handle MongoDB duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Email already registered",
            });
        }
        // Handle validation errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map((e) => e.message);
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
exports.signup = signup;
// Request OTP for login
const login = async (req, res) => {
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
        const user = await User_1.default.findOne({ email: emailKey });
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
        const otp = (0, otp_1.generateOTP)();
        const hashedOTP = (0, otp_1.hashOTP)(otp);
        const otpExpires = (0, otp_1.getOTPExpiration)(10); // 10 minutes
        console.log("otp", otp);
        // Save OTP to user
        user.otp = hashedOTP;
        user.otpExpires = otpExpires;
        await user.save();
        // Send OTP email - build full name from parts
        const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
        await (0, email_1.sendOTPEmail)(user.email, fullName, otp, 'login');
        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please check your inbox.",
            data: {
                email: user.email,
            },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};
exports.login = login;
// Verify OTP for signup
const verifySignupOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }
        // Find user by email
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
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
        if ((0, otp_1.isOTPExpired)(user.otpExpires)) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }
        // Verify OTP
        if (!(0, otp_1.compareOTP)(otp, user.otp)) {
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
        if (user.role === roles_1.USER_ROLE.STUDENT) {
            user.isVerified = true;
            user.isActive = true;
            // Create Student entry with email and empty mobile number (to be filled later)
            try {
                await Student_1.default.create({
                    userId: user._id,
                    email: user.email, // Copy email from User to Student
                    mobileNumber: "", // Will be filled when student updates profile
                });
            }
            catch (error) {
                console.log("Student entry creation error (might already exist):", error);
            }
        }
        await user.save();
        // Generate JWT token for students (they can login immediately)
        const authToken = user.isVerified ? (0, jwt_1.generateToken)(user) : undefined;
        return res.status(200).json({
            success: true,
            message: user.role === roles_1.USER_ROLE.STUDENT
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
    }
    catch (err) {
        console.error("Verify signup OTP error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};
exports.verifySignupOTP = verifySignupOTP;
// Verify OTP and login
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }
        // Find user by email
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
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
        if ((0, otp_1.isOTPExpired)(user.otpExpires)) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }
        // Verify OTP
        if (!(0, otp_1.compareOTP)(otp, user.otp)) {
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
        const token = (0, jwt_1.generateToken)(user);
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
    }
    catch (err) {
        console.error("Verify OTP error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};
exports.verifyOTP = verifyOTP;
// Get current user profile (protected route)
const getProfile = async (req, res) => {
    try {
        // This will be used with authenticate middleware
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const responseData = {
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
        if (user.role === roles_1.USER_ROLE.ADMIN) {
            const admin = await Admin_1.default.findOne({ userId: user._id });
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
    }
    catch (err) {
        console.error("Get profile error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=authController.js.map