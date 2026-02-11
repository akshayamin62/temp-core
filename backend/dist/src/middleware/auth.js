"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "No token provided. Please provide a valid authentication token.",
            });
            return;
        }
        // Extract token
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid token format",
            });
            return;
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
        // Check if user still exists
        const user = await User_1.default.findById(decoded.id).select("-password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User no longer exists",
            });
            return;
        }
        // Check if account is fully verified (email verified + admin approved if needed)
        if (!user.isVerified) {
            res.status(403).json({
                success: false,
                message: "Your account is pending verification. You will be notified via email once approved.",
            });
            return;
        }
        // Check if account is active
        if (!user.isActive) {
            res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact support.",
            });
            return;
        }
        // Attach user to request
        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error.message || "Authentication failed",
        });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map