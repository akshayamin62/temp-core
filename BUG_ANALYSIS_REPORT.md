# Kareer Studio — System Bug Analysis Report

---

## Executive Summary

A comprehensive analysis of the Kareer Studio platform identified **36 bugs and security issues** across the backend and frontend codebase. These are categorized by severity and impact area.

| Severity | Count |
|----------|-------|
| **Critical** | 7 |
| **High** | 11 |
| **Medium** | 13 |
| **Low** | 5 |
| **Total** | 36 |

---

## Critical Issues (7)

### BUG-001: Ivy League Test Question Routes — No Role Authorization
- **File:** `backend/src/routes/ivyTestQuestion.routes.ts`
- **Issue:** All routes (create, update, delete, toggle) have no `authorize()` middleware. Any authenticated user can create, modify, or delete test questions.
- **Impact:** A student could tamper with the test question bank.

### BUG-002: Ivy League Test Session Routes — No Role Authorization
- **File:** `backend/src/routes/ivyTestSession.routes.ts`
- **Issue:** All 6 routes have no `authorize()` middleware. Any authenticated user can start and take Ivy League tests.
- **Impact:** Non-student users can create test sessions and corrupt test data.

### BUG-003: Activity Routes — No Role Authorization
- **File:** `backend/src/routes/activity.routes.ts`
- **Issue:** Routes for creating and deleting activities have no `authorize()` middleware despite controller comments saying "superadmin only."
- **Impact:** Any authenticated user can manipulate the activity database.

### BUG-004: Excel Upload Route — No Role Authorization
- **File:** `backend/src/routes/excelUpload.routes.ts`
- **Issue:** `POST /api/ivy/excel-upload` has no `authorize()` middleware.
- **Impact:** Any authenticated user can upload bulk data into the agent suggestions system.

### BUG-014: No Rate Limiting on Any Endpoint
- **File:** `backend/src/server.ts`
- **Issue:** No rate limiting middleware anywhere. Login, signup, OTP verification are unprotected against brute force.
- **Impact:** 4-digit OTP brute force (10,000 attempts), credential stuffing, API abuse, DoS.

### BUG-015: CORS Allows All Origins
- **File:** `backend/src/server.ts`
- **Issue:** `app.use(cors())` with no configuration allows requests from any origin.
- **Impact:** Cross-site request forgery; any malicious website can make authenticated API calls.

### BUG-031: Ivy League Admin Routes — No SUPER_ADMIN Authorization
- **File:** `backend/src/routes/ivyLeagueAdmin.routes.ts`
- **Issue:** Despite being mounted at `/api/super-admin/ivy-league/`, these routes have no `authorize(USER_ROLE.SUPER_ADMIN)`. Any authenticated user can access candidate management, student conversion, expert assignment.
- **Impact:** Complete privilege escalation on Ivy League administration.

---

## High Issues (11)

### BUG-005: Grammar Check Route — No Role Authorization
- **File:** `backend/src/routes/grammarCheck.routes.ts`
- **Issue:** Any authenticated user can use the grammar check API, incurring external API costs.

### BUG-006: Ivy Admin Performance Route — No Role Authorization  
- **File:** `backend/src/routes/admin.routes.ts`
- **Issue:** `/api/ivy/admin/ivy-expert/performance` accessible by any authenticated user.

### BUG-007: User Routes — No Role Authorization
- **File:** `backend/src/routes/user.routes.ts`
- **Issue:** `GET /api/ivy/users?role=STUDENT` accessible by any authenticated user.
- **Impact:** Complete user enumeration and personal data exposure.

### BUG-008: Ivy League Admin Routes — No Route-Level Auth
- **File:** `backend/src/routes/ivyLeagueAdmin.routes.ts`
- **Issue:** All 15+ endpoints for stats, candidates, students, test results have no authorization.

### BUG-010: Enrollment Status Update — Missing Authorization
- **File:** `backend/src/routes/enrollmentRoutes.ts`
- **Issue:** `PATCH /api/enrollments/:id/status` has no ownership or role verification. Any authenticated user can change any enrollment status.

### BUG-012: `isVerified` Check Commented Out
- **File:** `backend/src/middleware/auth.ts`
- **Issue:** The `isVerified` check is commented out, allowing unverified/unapproved accounts to access all endpoints.
- **Impact:** Bypasses the admin approval workflow entirely.

### BUG-013: OTP Logged to Console in Production
- **File:** `backend/src/controllers/authController.ts`
- **Issue:** `console.log("otp", otp)` logs plaintext OTP to server console during signup.

### BUG-016: File Upload Accepts All File Types
- **File:** `backend/src/middleware/upload.ts`
- **Issue:** The `fileFilter` callback accepts all file types. No MIME type or extension validation.
- **Impact:** Users can upload executable files or HTML with XSS.

### BUG-017: No Path Traversal Protection on File Serving
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** File paths from DB joined with `process.cwd()`. If DB record contains `../../../etc/passwd`, it could serve arbitrary files.

### BUG-025: Client-Side-Only Auth Guards
- **Files:** All frontend page files
- **Issue:** No server-side middleware or Next.js middleware for route protection. All role checks use `useEffect` with localStorage.
- **Impact:** Role-restricted pages accessible by modifying localStorage (backend API is the only real enforcement).

### BUG-032: Notification Routes — Missing `authenticate`
- **File:** `backend/src/routes/notification.routes.ts`
- **Issue:** Uses `authorize()` but doesn't call `authenticate` at router level. Routes may not be mounted in server.ts.

---

## Medium Issues (13)

### BUG-009: Ivy Service Details — No Authorization
- **File:** `backend/src/routes/ivyService.routes.ts`
- **Issue:** `GET /api/ivy/ivy-service/:serviceId` accessible by any authenticated user.

### BUG-011: Document Upload — No Role Authorization
- **File:** `backend/src/routes/documentRoutes.ts`
- **Issue:** `POST /api/documents/upload` has no `authorize()`. Any authenticated user can upload documents to any registration.

### BUG-018: Static Uploads Directory Publicly Accessible
- **File:** `backend/src/server.ts`
- **Issue:** `/uploads` served with `express.static()` — no authentication required. Anyone who knows a file URL can access uploaded documents.

### BUG-019: Sensitive Fields Not Consistently Excluded
- **File:** `backend/src/controllers/superAdminController.ts`
- **Issue:** Some queries exclude `-password` but not `otp`, `otpExpires`, `emailVerificationToken`. Inconsistent field exclusion.

### BUG-020: No CSRF Protection
- **File:** `backend/src/server.ts`
- **Issue:** No CSRF protection middleware. Combined with wildcard CORS, this is exploitable.

### BUG-021: Race Condition in Form Answer Saves
- **File:** `backend/src/controllers/formAnswerController.ts`
- **Issue:** Read-modify-write pattern without locking. Concurrent saves can overwrite each other.

### BUG-022: Race Condition in Document Upload
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Non-atomic operations for single-file fields. Two simultaneous uploads can create duplicates.

### BUG-023: Enrollment Status — No State Machine Validation
- **File:** `backend/src/controllers/enrollmentController.ts`
- **Issue:** Allows any valid status value without checking if the transition is valid (e.g., NOT_STARTED → COMPLETED).

### BUG-027: `readOnly` Query Param Client-Controlled
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`
- **Issue:** UI read-only flag from URL query parameter. Removable by user.

### BUG-028: Flash of Unauthorized Content
- **Files:** All role-specific pages
- **Issue:** Client-side role checks in useEffect cause brief content flash before redirect.

### BUG-033: Pointer 1 Routes — Overly Permissive
- **File:** `backend/src/routes/pointer1.routes.ts`
- **Issue:** Academic data CRUD authorized for ADMIN and COUNSELOR in addition to IVY_EXPERT/STUDENT/SUPER_ADMIN.

### BUG-034: ADMIN/COUNSELOR/PARENT Can See Any Student's Documents
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Only STUDENT and OPS roles have ownership checks. No check that a PARENT is actually linked to the student.

### BUG-035: Document Download — Same Data Isolation Issue
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Same problem as BUG-034 for `downloadDocument` and `viewDocument`.

---

## Low Issues (5)

### BUG-024: Parent Sync Not Atomic
- **File:** `backend/src/controllers/formAnswerController.ts`
- **Issue:** `syncParentsIfPresent` called after saving form answers. If sync fails, form is saved but parent records are inconsistent.

### BUG-026: Ivy League Student Layout — No Role Verification
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`
- **Issue:** No role check. Any user can navigate to `/ivy-league/student/*`.

### BUG-029: PARENT Missing from Dashboard Redirect
- **File:** `frontend/src/app/dashboard/page.tsx`
- **Issue:** Dashboard redirect logic doesn't handle PARENT role. Parents see student service selection instead of parent dashboard.

### BUG-030: Inconsistent Auth Redirect Destinations
- **Files:** Various frontend pages
- **Issue:** Some pages redirect to `/login`, others to `/dashboard`, and student pages to `/student/registration`.

### BUG-036: `updateSPProfile` Uses Wrong Request Type
- **File:** `backend/src/controllers/authController.ts`
- **Issue:** Uses `Request` instead of `AuthRequest`, then casts `req as any` to access `req.user`.

---

## Recommended Priority Actions

### Immediate (Before Production)
1. Add `authorize()` to ALL Ivy League routes (BUG-001, 002, 003, 004, 006, 007, 008, 031)
2. Implement rate limiting on auth endpoints (BUG-014)
3. Configure CORS whitelist (BUG-015)
4. Uncomment or replace `isVerified` check (BUG-012)
5. Remove OTP console.log (BUG-013)

### Short-Term
6. Add file type validation to uploads (BUG-016)
7. Protect static uploads directory (BUG-018)
8. Add parent data isolation in document controllers (BUG-034, 035)
9. Add enrollment status state machine (BUG-023)
10. Add authorization to enrollment status update (BUG-010)

### Medium-Term
11. Implement Next.js middleware for server-side route protection (BUG-025)
12. Add CSRF protection (BUG-020)
13. Add path traversal protection (BUG-017)
14. Fix race conditions with optimistic locking (BUG-021, 022)
15. Add atomic parent sync with transactions (BUG-024)

---

*Report generated: July 2025*
*CORE Bug Analysis*
