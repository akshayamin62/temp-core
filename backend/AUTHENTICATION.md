# Authentication System Documentation

## Overview
Complete JWT-based authentication system with signup, login, and protected routes.

## Features
- ✅ User signup with role-based access
- ✅ User login with JWT token generation
- ✅ Email verification system (verify & resend)
- ✅ Protected routes with authentication middleware
- ✅ Password reset functionality (forgot password & reset)
- ✅ Input validation for all endpoints
- ✅ Password hashing with bcryptjs
- ✅ Token verification and expiration
- ✅ Consistent error handling
- ✅ TypeScript type safety

## API Endpoints

### Public Routes

#### 1. Sign Up
```
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "isVerified": false
    }
  }
}
```

**Note:** No JWT token is returned. All users must verify their email first.

**Available Roles:**
- `STUDENT` - Requires email verification, then can login immediately
- `OPS` - Requires email verification + additional verification
- `ALUMNI` - Requires email verification + additional verification
- `ADMIN` - Requires email verification + additional verification
- `SERVICE_PROVIDER` - Requires email verification + additional verification
- `PARENT` - Cannot sign up directly (restricted)

**Notes:**
- **Email verification is required for EVERYONE** (including students)
- After email verification:
  - **Students**: Can login immediately (`isVerified = true`)
  - **Others**: Need additional verification (`isVerified = false` until admin/role-based verification)
- Verification email is sent automatically after signup to all users

#### 2. Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    },
    "token": "jwt_token_here"
  }
}
```

#### 3. Verify Email
```
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

**Success Response (200) - For Students:**
```json
{
  "success": true,
  "message": "Email verified successfully. Your account is now active.",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "isVerified": true
    }
  }
}
```

**Success Response (200) - For Other Roles:**
```json
{
  "success": true,
  "message": "Email verified successfully. Your account is pending additional verification.",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "OPS",
      "isVerified": false
    }
  }
}
```

**Notes:**
- Students receive a JWT token and can login immediately
- Other roles need additional verification (admin approval) before they can login
- No token is returned for non-students until `isVerified = true`

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired verification token. Please request a new one."
}
```

**Notes:**
- Token is received from the verification email sent after signup
- Token expires after 24 hours
- **Students**: Receive JWT token and can login immediately
- **Other roles**: Need additional verification (admin approval) before login
- Required for ALL users (including students)

#### 4. Resend Verification Email
```
POST /api/auth/resend-verification
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists and is not verified, a verification email has been sent."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email is already verified"
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Only sends email if account exists and email is not yet verified
- Works for ALL users (including students)

#### 5. Request Password Reset (Forgot Password)
```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration attacks
- Sends password reset email with a secure token
- Reset token expires in 1 hour
- The reset link will be sent to the email address

#### 6. Reset Password
```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password.",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new one."
}
```

**Notes:**
- Token is received from the password reset email
- Token expires after 1 hour
- Returns a new JWT token for immediate login
- Old password reset tokens are invalidated after use

### Protected Routes

#### 7. Get Profile
```
GET /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Error Responses

All errors follow this structure:
```json
{
  "success": false,
  "message": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials or token)
- `403` - Forbidden (account not verified)
- `404` - Not Found
- `500` - Internal Server Error

## Environment Variables

Add these to your `.env` file:

```env
# Server
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d  # Options: "1h", "24h", "7d", "30d", etc.

# Email Verification
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email  # Frontend email verification page URL

# Password Reset
PASSWORD_RESET_URL=http://localhost:3000/reset-password  # Frontend reset password page URL
```

## Usage Examples

### Using Authentication Middleware

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { yourController } from "../controllers/yourController";

const router = Router();

// Protected route
router.get("/protected", authenticate, yourController);
```

### Accessing User in Controller

```typescript
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

export const yourController = (req: AuthRequest, res: Response) => {
  // Access authenticated user
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const userRole = req.user?.role;
  
  // Your logic here
};
```

### Using Role-Based Authorization

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize, adminOnly, adminOrOps } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { yourController } from "../controllers/yourController";

const router = Router();

// Single role - only admins
router.get("/admin-only", authenticate, authorize(USER_ROLE.SUPER_ADMIN), yourController);

// Multiple roles - admins or ops
router.get("/staff-only", 
  authenticate, 
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS), 
  yourController
);

// Using convenience functions
router.get("/admin-route", authenticate, adminOnly, yourController);
router.get("/staff-route", authenticate, adminOrOps, yourController);

// Students only
router.get("/student-route", authenticate, authorize(USER_ROLE.STUDENT), yourController);
```

**Available Convenience Functions:**
- `adminOnly` - Only admins can access
- `opsOnly` - Only ops can access
- `studentOnly` - Only students can access
- `adminOrOps` - Admins or ops can access
- `adminOpsOrServiceProvider` - Admins, ops, or service providers
- `nonStudentOnly` - All roles except students

**Important:** Always use `authenticate` middleware before `authorize` middleware.

## Folder Structure

```
backend/src/
├── controllers/
│   └── authController.ts    # Signup, login, profile, email verification, password reset controllers
├── middleware/
│   ├── auth.ts              # Authentication middleware
│   ├── authorize.ts         # Role-based authorization middleware
│   └── validate.ts          # Input validation middleware
├── models/
│   └── User.ts              # User model with Mongoose
├── routes/
│   └── authRoutes.ts        # Authentication routes
├── types/
│   ├── auth.ts              # Auth-related TypeScript types
│   └── roles.ts             # User role enum
└── utils/
    ├── hash.ts              # Password hashing utilities
    ├── jwt.ts               # JWT token generation and verification
    ├── resetToken.ts         # Password reset & email verification token utilities
    └── email.ts             # Email service utilities
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcryptjs before storage
2. **JWT Tokens**: Secure token-based authentication
3. **Email Verification**: Required for ALL users (24-hour expiration)
4. **Two-Level Verification**:
   - **Email Verification**: Required for everyone
   - **Additional Verification**: Required for non-students (admin approval)
5. **Password Reset**: Secure token-based password reset with email verification
6. **Input Validation**: All inputs are validated before processing
7. **Email Normalization**: Emails are converted to lowercase
8. **Account Verification**: 
   - Email must be verified before login (all users)
   - Additional verification required for non-students (`isVerified` field)
9. **Token Expiration**: Tokens expire based on JWT_EXPIRES_IN setting
10. **Reset Token Security**: Reset tokens are hashed before storage and expire after 1 hour
11. **Verification Token Security**: Verification tokens are hashed before storage and expire after 24 hours
12. **Email Enumeration Prevention**: Password reset and resend verification endpoints don't reveal if email exists
13. **Role-Based Authorization**: Routes can be protected based on user roles

## Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "STUDENT"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Verify Email
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification_token_from_email"
  }'
```

### Resend Verification Email
```bash
curl -X POST http://localhost:5000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### Request Password Reset
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### Reset Password
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_from_email",
    "password": "newpassword123"
  }'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Email Verification Flow

1. **User signs up**: User creates account via `/api/auth/signup`
   - **ALL users** (including students) receive a verification email
   - `isVerified = false` for everyone initially
2. **Token generation**: System generates verification token and hashes it
3. **Email sent**: Verification link with token is sent to user's email
4. **User clicks link**: User is redirected to frontend verification page with token
5. **Email verification**: User submits token via `/api/auth/verify-email`
6. **Token validation**: System validates token and checks expiration (24 hours)
7. **Email verified**: Email verification token is cleared
8. **Role-based verification**:
   - **Students**: `isVerified = true`, receive JWT token, can login immediately
   - **Other roles**: `isVerified = false`, need additional verification (admin approval)
9. **Login**: 
   - Students can login after email verification
   - Others must wait for additional verification before login

## Password Reset Flow

1. **User requests password reset**: User submits their email via `/api/auth/forgot-password`
2. **Token generation**: System generates a secure random token and hashes it
3. **Email sent**: Reset link with token is sent to user's email
4. **User clicks link**: User is redirected to frontend reset password page with token
5. **Password reset**: User submits new password with token via `/api/auth/reset-password`
6. **Token validation**: System validates token and checks expiration (1 hour)
7. **Password updated**: New password is hashed and saved, token is invalidated
8. **Auto-login**: User receives new JWT token for immediate login

## Email Service Setup

The email service (`utils/email.ts`) currently logs emails to console in development mode. To enable actual email sending in production:

1. **Install nodemailer** (or your preferred email service):
   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **Configure SMTP in `.env`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   FROM_EMAIL=noreply@yourapp.com
   ```

3. **Update `utils/email.ts`** to use actual email service (see comments in file)

Alternatively, integrate with services like:
- **SendGrid**: `npm install @sendgrid/mail`
- **AWS SES**: `npm install aws-sdk`
- **Mailgun**: `npm install mailgun-js`
- **Resend**: `npm install resend`

## Next Steps

- [x] Add password reset functionality
- [x] Add email verification system
- [x] Add role-based authorization middleware
- [ ] Add refresh token mechanism
- [ ] Add rate limiting for auth endpoints
- [ ] Add logging for security events
- [ ] Integrate production email service


