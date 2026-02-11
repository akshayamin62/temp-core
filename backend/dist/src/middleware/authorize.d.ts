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
export declare const authorize: (...allowedRoles: (USER_ROLE | USER_ROLE[])[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Convenience functions for common role checks
 */
export declare const adminOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const opsOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const studentOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const adminOrOps: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const adminOpsOrServiceProvider: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const nonStudentOnly: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorize.d.ts.map