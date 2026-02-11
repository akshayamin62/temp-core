"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonStudentOnly = exports.adminOpsOrServiceProvider = exports.adminOrOps = exports.studentOnly = exports.opsOnly = exports.adminOnly = exports.authorize = void 0;
const roles_1 = require("../types/roles");
/**
 * Role-based authorization middleware
 *
 * Usage:
 * - authorize(USER_ROLE.SUPER_ADMIN) - Only admins can access
 * - authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS]) - Admins or ops can access
 */
const authorize = (...allowedRoles) => {
    // Flatten the array in case nested arrays are passed
    const roles = allowedRoles.flat();
    return (req, res, next) => {
        // Check if user is authenticated (should be set by authenticate middleware)
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required. Please login first.",
            });
            return;
        }
        // Check if user's role is in the allowed roles
        const userRole = req.user.role;
        if (!roles.includes(userRole)) {
            res.status(403).json({
                success: false,
                message: `Access denied. This resource requires one of the following roles: ${roles.join(", ")}. Your role: ${userRole}`,
            });
            return;
        }
        // User has required role, proceed
        next();
    };
};
exports.authorize = authorize;
/**
 * Convenience functions for common role checks
 */
// Only admins can access
exports.adminOnly = (0, exports.authorize)(roles_1.USER_ROLE.SUPER_ADMIN);
// Only ops can access
exports.opsOnly = (0, exports.authorize)(roles_1.USER_ROLE.OPS);
// Only students can access
exports.studentOnly = (0, exports.authorize)(roles_1.USER_ROLE.STUDENT);
// Admins or ops can access
exports.adminOrOps = (0, exports.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS);
// Admins, ops, or service providers can access
exports.adminOpsOrServiceProvider = (0, exports.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SERVICE_PROVIDER);
// All verified users except students
exports.nonStudentOnly = (0, exports.authorize)(roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.ALUMNI, roles_1.USER_ROLE.SERVICE_PROVIDER, roles_1.USER_ROLE.PARENT);
//# sourceMappingURL=authorize.js.map