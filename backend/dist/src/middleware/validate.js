"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateSignup = void 0;
const roles_1 = require("../types/roles");
// Validation helper function
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
// Signup validation middleware (OTP-based, no password)
const validateSignup = (req, res, next) => {
    const { firstName, lastName, email, role } = req.body;
    // Check required fields
    if (!firstName || !lastName || !email || !role) {
        res.status(400).json({
            success: false,
            message: "All fields are required: firstName, lastName, email, role",
        });
        return;
    }
    // Validate first name
    if (typeof firstName !== "string" || firstName.trim().length < 2) {
        res.status(400).json({
            success: false,
            message: "First name must be at least 2 characters long",
        });
        return;
    }
    // Validate last name
    if (typeof lastName !== "string" || lastName.trim().length < 1) {
        res.status(400).json({
            success: false,
            message: "Last name is required",
        });
        return;
    }
    // Validate email
    if (typeof email !== "string" || !validateEmail(email)) {
        res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
        });
        return;
    }
    // Validate role
    if (!Object.values(roles_1.USER_ROLE).includes(role)) {
        res.status(400).json({
            success: false,
            message: `Invalid role. Must be one of: ${Object.values(roles_1.USER_ROLE).join(", ")}`,
        });
        return;
    }
    // Check if parent or ops is trying to sign up directly
    if (role === roles_1.USER_ROLE.PARENT) {
        res.status(403).json({
            success: false,
            message: "Parent cannot sign up directly",
        });
        return;
    }
    if (role === roles_1.USER_ROLE.OPS) {
        res.status(403).json({
            success: false,
            message: "Ops cannot sign up directly",
        });
        return;
    }
    // Only allow STUDENT, ALUMNI, and SERVICE_PROVIDER to sign up
    const allowedRoles = [roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.ALUMNI, roles_1.USER_ROLE.SERVICE_PROVIDER];
    if (!allowedRoles.includes(role)) {
        res.status(403).json({
            success: false,
            message: "This role cannot sign up directly",
        });
        return;
    }
    next();
};
exports.validateSignup = validateSignup;
// Generic validation middleware for required fields
const validateRequest = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = [];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
            return;
        }
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validate.js.map