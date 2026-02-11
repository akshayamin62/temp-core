# Authentication & Authorization Middleware

## Overview
This directory contains middleware functions for authentication, authorization, and validation.

## Files

### `auth.ts`
Authentication middleware to protect routes that require user authentication.

**Usage:**
```typescript
import { authenticate } from "../middleware/auth";

router.get("/protected-route", authenticate, controllerFunction);
```

**How it works:**
1. Extracts JWT token from `Authorization` header (format: `Bearer <token>`)
2. Verifies the token
3. Checks if user exists and is verified (email + additional verification)
4. Attaches user info to `req.user` for use in controllers

**Request Extension:**
The middleware extends the Express Request object:
```typescript
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
```

### `authorize.ts`
Role-based authorization middleware to restrict access based on user roles.

**Usage:**
```typescript
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { authenticate } from "../middleware/auth";

// Single role
router.get("/admin-only", authenticate, authorize(USER_ROLE.SUPER_ADMIN), controllerFunction);

// Multiple roles
router.get("/admin-or-OPS", 
  authenticate, 
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), 
  controllerFunction
);

// Using convenience functions
import { adminOnly, adminOrOps } from "../middleware/authorize";

router.get("/admin-route", authenticate, adminOnly, controllerFunction);
router.get("/staff-route", authenticate, adminOrOps, controllerFunction);
```

**Available Convenience Functions:**
- `adminOnly` - Only admins
- `opsOnly` - Only ops
- `studentOnly` - Only students
- `adminOrOps` - Admins or ops
- `adminOpsOrServiceProvider` - Admins, ops, or service providers
- `nonStudentOnly` - All roles except students

**How it works:**
1. Must be used after `authenticate` middleware
2. Checks if user's role is in the allowed roles list
3. Returns 403 Forbidden if user doesn't have required role
4. Proceeds to next middleware/controller if authorized

### `validate.ts`
Input validation middleware for signup and login endpoints.

**Functions:**
- `validateSignup`: Validates signup request body
- `validateLogin`: Validates login request body
- `validateVerifyEmail`: Validates email verification token
- `validateResendVerification`: Validates email for resend verification
- `validateRequestPasswordReset`: Validates email for password reset
- `validateResetPassword`: Validates token and password for reset

**Validation Rules:**
- **Signup:**
  - Name: minimum 2 characters
  - Email: valid email format
  - Password: minimum 6 characters
  - Role: must be a valid USER_ROLE (except PARENT)
  
- **Login:**
  - Email: valid email format
  - Password: required


