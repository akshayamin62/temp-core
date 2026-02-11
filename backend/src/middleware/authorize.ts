import { Response, NextFunction } from "express";
import { USER_ROLE } from "../types/roles";
import { AuthRequest } from "./auth";

/**
 * Role-based authorization middleware
 * 
 * Usage:
 * - authorize(USER_ROLE.SUPER_ADMIN) - Only admins can access
 * - authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS]) - Admins or ops can access
 */

export const authorize = (...allowedRoles: (USER_ROLE | USER_ROLE[])[]) => {
  // Flatten the array in case nested arrays are passed
  const roles = allowedRoles.flat();

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated (should be set by authenticate middleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
      return;
    }

    // Check if user's role is in the allowed roles
    const userRole = req.user.role as USER_ROLE;
    
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

/**
 * Convenience functions for common role checks
 */

// Only admins can access
export const adminOnly = authorize(USER_ROLE.SUPER_ADMIN);

// Only ops can access
export const opsOnly = authorize(USER_ROLE.OPS);

// Only students can access
export const studentOnly = authorize(USER_ROLE.STUDENT);

// Admins or ops can access
export const adminOrOps = authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS);

// Admins, ops, or service providers can access
export const adminOpsOrServiceProvider = authorize(
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.OPS,
  USER_ROLE.SERVICE_PROVIDER
);

// All verified users except students
export const nonStudentOnly = authorize(
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.OPS,
  USER_ROLE.ALUMNI,
  USER_ROLE.SERVICE_PROVIDER,
  USER_ROLE.PARENT
);


