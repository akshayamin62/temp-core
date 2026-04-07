# Kareer Studio — System Bug Analysis Report

**Last Updated:** April 7, 2026  
**Previous Version:** March 2026

---

## Executive Summary

Comprehensive security audit of the Kareer Studio platform. All critical and high-severity issues have been resolved. Remaining open bugs are medium and low severity.

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 7 |
| **Low** | 8 |
| **Total** | 15 |

---

## Previously Fixed / Resolved Bugs (Summary)

The following bugs have been fixed, reclassified, or closed. Details removed for clarity.

| Bug | Description | Resolution |
|-----|-------------|------------|
| BUG-001 | ivyTestQuestion — no authorize | ✅ Fixed (SUPER_ADMIN) |
| BUG-002 | ivyTestSession — no authorize | ✅ Fixed (STUDENT) |
| BUG-003 | activity.routes — no authorize | ✅ Fixed (SUPER_ADMIN) |
| BUG-004 | excelUpload — no authorize | ✅ Fixed (IVY_EXPERT) |
| BUG-005 | grammarCheck — no authorize | ✅ Fixed (IVY_EXPERT) |
| BUG-006 | admin.routes — no authorize | ✅ Fixed (SUPER_ADMIN, dead route) |
| BUG-007 | user.routes — no authorize | ✅ Fixed (SUPER_ADMIN, dead route) |
| BUG-008 | ivyLeagueAdmin — no route auth | ✅ Fixed (per-route authorize) |
| BUG-009 | ivyService /:serviceId — no authorize | ✅ Fixed (9 connected roles) |
| BUG-010 | enrollmentRoutes — missing auth | ⚪ Dead code (deleted) |
| BUG-011 | document upload — no authorize | ✅ Fixed (SUPER_ADMIN, OPS, STUDENT) |
| BUG-012 | isVerified check disabled | ✅ By design |
| BUG-013 | OTP logged to console | ✅ Fixed (removed) |
| BUG-014 | No rate limiting | ✅ Fixed (3-tier rate limiting) |
| BUG-015 | CORS allows all origins | ✅ Fixed (whitelist) |
| BUG-016 | File upload accepts all types | ✅ Fixed (file filter) |
| BUG-017 | No path traversal protection | ✅ Fixed (validateFilePath) |
| BUG-018 | Static uploads publicly accessible | ✅ Fixed (authenticated + AuthImage) |
| BUG-019 | Sensitive fields not excluded | ✅ Fixed (select: false on otp/otpExpires) |
| BUG-021 | Race condition in form saves | ✅ Fixed (findOneAndUpdate atomic upsert) |
| BUG-022 | Race condition in doc upload | ✅ Fixed (findOneAndUpdate atomic upsert) |
| BUG-023 | Enrollment status — no validation | ⚪ Dead code (deleted) |
| BUG-025 | Client-side-only auth guards | ✅ Won't fix (by design) |
| BUG-029 | PARENT missing from dashboard | ✅ Fixed |
| BUG-031 | ivyLeagueAdmin — no SUPER_ADMIN | ✅ Fixed (same as BUG-008) |
| BUG-032 | notification.routes — no authenticate | ⚪ Dead code (not mounted) |
| BUG-037 | activityRoutes — no per-route auth | ✅ Fixed (3-way role split) |
| BUG-038 | invoiceRoutes — all roles access | ✅ By design |
| BUG-039 | ledgerRoutes — all roles access | ✅ By design |
| BUG-040 | Payment routes — no authorize | ✅ Fixed (authorize + ownership check) |
| BUG-041 | No security headers | ✅ Fixed (helmet) |
| BUG-042 | OTP brute force | ✅ Fixed (6-digit + rate limit) |
| BUG-043 | Client-side captcha bypass | ✅ Fixed (server-side math captcha) |
| BUG-044 | TeamMeet routes too permissive | ✅ By design (route order fixed) |
| BUG-020 | No CSRF protection | ✅ By design (Authorization header, not cookies) |
| BUG-033 | Pointer 1 routes overly permissive | ✅ Fixed (removed ADMIN/COUNSELOR from write/delete) |
| BUG-034 | ADMIN/COUNSELOR/PARENT see any docs | ✅ By design (permission granted) |
| BUG-035 | Document download data isolation | ✅ By design (permission granted) |
| BUG-045 | Document upload no ownership | ✅ Fixed (ownership check for STUDENT/OPS) |

---

## Medium Issues (7 open)

### BUG-027: `readOnly` Query Param Client-Controlled ⚠️
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`, `frontend/src/app/ivy-league/student/useStudentService.ts`
- **Issue:** `readOnly` is entirely a URL query parameter (`?readOnly=true`) parsed client-side. No backend enforcement. Any user can remove it to get write access.
- **Impact:** Privilege escalation for users who should only have read-only access.

### BUG-046: Service Plan Routes — Missing Authorization ⚠️
- **File:** `backend/src/routes/servicePlanRoutes.ts`
- **Issue:** `GET /student/:studentId/plan-tiers` and `GET /:serviceSlug/admin/:adminId/pricing` have no `authorize()`. Any authenticated user can query any student's plan tiers or any admin's pricing.

### BUG-047: Student Plan Discount Route — Missing Authorization ⚠️
- **File:** `backend/src/routes/studentPlanDiscountRoutes.ts`
- **Issue:** `GET /student/:studentId` has no `authorize()`. Any authenticated user can view any student's discount information.

### BUG-048: Auth Routes — SP Profile Update Not Role-Restricted ⚠️
- **File:** `backend/src/routes/authRoutes.ts`
- **Issue:** `PUT /sp-profile` has `authenticate` but no `authorize(USER_ROLE.SERVICE_PROVIDER)`. Any authenticated user can update service provider profile fields.

### BUG-049: Ivy League Student Pages — No Role Verification ⚠️
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`
- **Issue:** Layout renders the full navigation sidebar without verifying the logged-in user's identity or role. No role gate exists — any authenticated user navigating to `/ivy-league/student/*` sees full content.

---

## Low Issues (8 open)

### BUG-024: Parent Sync Not Atomic ⚠️
- **File:** `backend/src/controllers/formAnswerController.ts`
- **Issue:** `syncParentsIfPresent` called after saving form answers. If sync fails, form is saved but parent records are inconsistent.

### BUG-028: Flash of Unauthorized Content ⚠️
- **Files:** All role-specific pages
- **Issue:** Client-side role checks in `useEffect` cause brief content flash before redirect. Page HTML and JS bundles served to any visitor.

### BUG-030: Inconsistent Auth Redirect Destinations ⚠️
- **Files:** Various frontend pages
- **Issue:** Some pages redirect to `/login`, others to `/dashboard`, and student pages to `/student/registration`.

### BUG-036: `updateSPProfile` Uses Wrong Request Type ⚠️
- **File:** `backend/src/controllers/authController.ts`
- **Issue:** Uses `Request` instead of `AuthRequest`, then casts `req as any` to access `req.user`.

### BUG-050: Token Stored in localStorage ⚠️
- **File:** `frontend/src/lib/api.ts`
- **Issue:** JWT token stored in `localStorage`. If XSS exists anywhere, the token can be stolen. Risk significantly reduced since BUG-016 (file type filter) and BUG-018 (authenticated uploads) are now fixed.

### BUG-051: Authorize Middleware Leaks User Role ⚠️
- **File:** `backend/src/middleware/authorize.ts`
- **Issue:** 403 response includes `"Your role: ${userRole}"`. Attacker can discover their role and what roles each endpoint requires.

### BUG-052: Error Messages Leak Internal Details ⚠️
- **Files:** Multiple controllers
- **Issue:** `error.message` returned in 500 responses. Could leak DB schema names, field names, and stack info.

### BUG-053: Coaching Batch List — No Authorization ⚠️
- **File:** `backend/src/routes/coachingBatchRoutes.ts`
- **Issue:** `GET /` has no `authorize()`. Any authenticated user can list active batches. Low risk — likely intentional.

---

## Recommended Priority Actions

### Next (Short-Term)
1. **Restrict SP profile update** to SERVICE_PROVIDER role (BUG-048)
2. **Add role checks to service plan and discount routes** (BUG-046, 047)
3. **Fix authorize role leak** — remove role from 403 response (BUG-051)
4. **Sanitize error messages** — return generic "Server error" instead of `error.message` (BUG-052)

### Medium-Term
5. **Enforce `readOnly` server-side** on Ivy League routes (BUG-027)
6. **Add role verification** to Ivy League student pages (BUG-049)
7. **Add atomic parent sync** with MongoDB transactions (BUG-024)
8. **Consider httpOnly cookies** instead of localStorage for token (BUG-050)

### Low Priority (Code Quality)
11. **Fix SP profile request type** (BUG-036)
12. **Standardize redirect destinations** (BUG-030)
13. **Reduce content flash** on page load (BUG-028)

---

## Route Authorization Summary Table

| Route File | authenticate | authorize | Status |
|---|---|---|---|
| `authRoutes.ts` | Per-route | NO | ⚠️ SP profile unprotected |
| `superAdminRoutes.ts` | Router-level | SUPER_ADMIN | ✅ |
| `superAdminStudentRoutes.ts` | Router-level | 4 roles | ✅ |
| `adminRoutes.ts` | Router-level | ADMIN | ✅ |
| `adminStudentRoutes.ts` | Router-level | 3 roles | ✅ |
| `studentRoutes.ts` | Per-route | STUDENT | ✅ |
| `referrerRoutes.ts` | Router-level | REFERRER | ✅ |
| `leadRoutes.ts` | Per-route | Per-route | ✅ |
| `leadStudentConversionRoutes.ts` | Router-level | Per-route | ✅ |
| `followUpRoutes.ts` | Router-level | Per-route | ✅ |
| `parentRoutes.ts` | Per-route | Per-route | ✅ |
| `chatRoutes.ts` | Router-level | Per-route | ✅ |
| `teamMeetRoutes.ts` | Router-level | 9 roles | ✅ By Design |
| `serviceRoutes.ts` | Per-route | Per-route | ✅ |
| `formAnswerRoutes.ts` | Per-route | Per-route | ✅ |
| `programRoutes.ts` | Router-level | Per-route | ✅ |
| `documentRoutes.ts` | Router-level | Per-route | ✅ |
| `coreDocumentRoutes.ts` | Router-level | Per-route | ✅ |
| `portfolioRoutes.ts` | Router-level | Per-route | ✅ |
| `brainographyRoutes.ts` | Router-level | Per-route | ✅ |
| `archiveRoutes.ts` | Router-level | Per-route | ✅ |
| `activityRoutes.ts` | Router-level | Per-route | ✅ |
| `coachingBatchRoutes.ts` | Per-route | PARTIAL | ⚠️ GET / unprotected |
| `paymentRoutes.ts` | Per-route | Per-route | ✅ |
| `servicePlanRoutes.ts` | Per-route | PARTIAL | ⚠️ 2 routes unprotected |
| `studentPlanDiscountRoutes.ts` | Per-route | PARTIAL | ⚠️ 1 route unprotected |
| `invoiceRoutes.ts` | Per-route | All auth users | ✅ By Design |
| `ledgerRoutes.ts` | Per-route | All auth users | ✅ By Design |
| `opsScheduleRoutes.ts` | Per-route + Router | Per-route | ✅ |
| `spDocumentRoutes.ts` | Router-level | Per-route | ✅ |
| `spServiceRoutes.ts` | Per-route | Per-route | ✅ |
| `ivyLeagueRegistrationRoutes.ts` | Per-route | STUDENT | ✅ |
| `ivyLeagueAdmin.routes.ts` | App-level | SUPER_ADMIN | ✅ |
| `ivyTestQuestion.routes.ts` | App-level | SUPER_ADMIN | ✅ |
| `ivyTestSession.routes.ts` | App-level | STUDENT | ✅ |
| `activity.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ |
| `excelUpload.routes.ts` | App-level | IVY_EXPERT | ✅ |
| `admin.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ |
| `user.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ |
| `grammarCheck.routes.ts` | App-level | IVY_EXPERT | ✅ |
| `ivyService.routes.ts` | App-level | Per-route | ✅ |
| `ivyScore.routes.ts` | App-level | Per-route | ✅ |
| `ivyExpertCandidate.routes.ts` | App-level | Per-route | ✅ |
| `pointer1.routes.ts` | App-level | Per-route | ✅ Fixed |
| `pointer5.routes.ts` | App-level | Per-route | ✅ |
| `pointer6.routes.ts` | App-level | Per-route | ✅ |
| `pointer234Activity.routes.ts` | App-level | Per-route | ✅ |
| `pointerActivity.routes.ts` | App-level | Per-route | ✅ |
| `taskConversation.routes.ts` | App-level | Per-route | ✅ |
| `agentSuggestion.routes.ts` | App-level | Per-route | ✅ |
| `studentInterest.routes.ts` | App-level | Per-route | ✅ |

---

*Last updated: April 7, 2026*  
*CORE Bug Analysis — Kareer Studio*
