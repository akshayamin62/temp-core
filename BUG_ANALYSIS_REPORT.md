# Kareer Studio — System Bug Analysis Report

**Last Updated:** April 2026  
**Previous Version:** March 2026

---

## Executive Summary

A comprehensive re-analysis of the Kareer Studio platform identified **52 bugs and security issues** across the backend and frontend codebase. Several bugs from the March 2026 report remain unfixed, and new issues were found in features added since then.

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 5 |
| **Medium** | 18 |
| **Low** | 10 |
| **Total** | 33 |

### Changes Since March 2026 Report

- **Fixed:** BUG-029 (PARENT dashboard redirect now handled)
- **Fixed (April 6, 2026):** BUG-001 (ivyTestQuestion — added SUPER_ADMIN authorize), BUG-002 (ivyTestSession — added STUDENT authorize), BUG-003 (activity.routes — added SUPER_ADMIN authorize), BUG-004 (excelUpload — added IVY_EXPERT authorize), BUG-031 (ivyLeagueAdmin — added SUPER_ADMIN authorize), BUG-037 (activityRoutes — added per-route role authorization)
- **By Design:** BUG-012 (`isVerified` check intentionally disabled — unverified users can sign in, inactive users cannot)
- **By Design:** BUG-038 (invoiceRoutes) and BUG-039 (ledgerRoutes) — accessible by all authenticated users associated with the student. Not a security issue.
- **Dead Code:** BUG-010 (enrollmentRoutes.ts) and BUG-032 (notification.routes.ts) are NOT mounted in server.ts — unreachable
- **New routes added:** `activityRoutes.ts`, `invoiceRoutes.ts`, `ledgerRoutes.ts`, `paymentRoutes.ts`, `servicePlanRoutes.ts`, `studentPlanDiscountRoutes.ts`, `coachingBatchRoutes.ts`, `ivyLeagueRegistrationRoutes.ts`, `referrerRoutes.ts`, `portfolioRoutes.ts`, `brainographyRoutes.ts`, `archiveRoutes.ts`, `spDocumentRoutes.ts`, `spServiceRoutes.ts`, `coreDocumentRoutes.ts`, `pointer` routes, `taskConversation.routes.ts`, `agentSuggestion.routes.ts`, `studentInterest.routes.ts`, `ivyExpertCandidate.routes.ts`
- **New bugs found:** 16 new issues in new and existing code (13 subsequently fixed or reclassified)

---

## Critical Issues (0)

All critical issues have been resolved. ✅

---

## High Issues (5)

### BUG-005: Grammar Check Route — No Role Authorization ✅ FIXED
- **File:** `backend/src/routes/grammarCheck.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.IVY_EXPERT)`. Only IVY_EXPERT can use grammar check.

### BUG-006: Ivy Admin Performance Route — No Role Authorization ✅ FIXED
- **File:** `backend/src/routes/admin.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.SUPER_ADMIN)`. Route is currently unused by frontend (dead route), locked to SUPER_ADMIN as a safety net.

### BUG-007: User Routes — No Role Authorization ✅ FIXED
- **File:** `backend/src/routes/user.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.SUPER_ADMIN)`. Route is currently unused by frontend (dead route — frontend uses `/api/super-admin/users` instead), locked to SUPER_ADMIN.

### BUG-013: OTP Logged to Console — BY DESIGN
- **File:** `backend/src/controllers/authController.ts`
- **Status:** Console logging kept intentionally for development convenience. Remove before production deployment.

### BUG-016: File Upload Accepts All File Types ✅ FIXED
- **File:** `backend/src/middleware/upload.ts`
- **Fix:** Default `fileFilter` now restricts to images (JPG, PNG, WEBP, AVIF, GIF), PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), and Excel (.xls, .xlsx). All other file types are rejected.

### BUG-017: No Path Traversal Protection on File Serving ⚠️ STILL OPEN
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** File paths from DB joined with `process.cwd()` without validating the resolved path stays within the uploads directory. If a DB record is tampered with, it could serve arbitrary system files.

### BUG-018: Static Uploads Directory Publicly Accessible ⚠️ STILL OPEN
- **File:** `backend/src/server.ts`
- **Issue:** `/uploads` served with `express.static()` — no authentication required. Anyone who knows a file URL can access uploaded documents, student files, admin logos, etc.
- **Impact:** Data breach if file paths are guessable or enumerated.

### BUG-025: Client-Side-Only Auth Guards ⚠️ STILL OPEN
- **Files:** All frontend page files
- **Issue:** No `middleware.ts` file exists in the Next.js frontend. All role checks use `useEffect` with localStorage token. No server-side route protection.
- **Impact:** Page HTML/JS bundles are served to unauthenticated users; role checks happen only after mount.

### BUG-040: Payment Routes — Missing Authorization on Sensitive Endpoints 🆕
- **File:** `backend/src/routes/paymentRoutes.ts`
- **Issue:** `POST /verify`, `POST /verify-registration`, `POST /verify-upgrade`, `GET /registration/:registrationId`, `GET /student/:studentId`, `GET /history/:studentId` — ALL have no `authorize()` middleware. Any authenticated user can view any student's payment data and payment history.
- **Impact:** Financial/payment data fully exposed across all roles.

### BUG-041: No Security Headers ⚠️ STILL OPEN
- **File:** `backend/src/server.ts`
- **Issue:** No `helmet` middleware. Missing: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
- **Impact:** XSS, clickjacking, MIME-sniffing attacks.

### BUG-042: OTP Brute Force — No Attempt Limiting ✅ FIXED
- **File:** `backend/src/server.ts`
- **Issue:** ~~No rate limit on OTP verification.~~ Fixed: OTP is now 6-digit (1,000,000 combinations). Rate limiter applied: 5 attempts per 10 minutes on `/verify-otp` and `/verify-signup-otp`, plus 20 attempts per 15 minutes on all `/api/auth` routes.

### BUG-043: Client-Side Captcha Bypass 🆕
- **File:** `backend/src/controllers/authController.ts` (lines 73-80, 150-157)
- **Issue:** Both `captcha` and `captchaInput` come from `req.body`. A malicious client can send identical values for both fields, completely bypassing the captcha. Captcha validation must happen server-side against a server-stored challenge.
- **Impact:** Automated signup/login abuse.

### BUG-044: TeamMeet Routes — Overly Permissive (9/11 Roles) 🆕
- **File:** `backend/src/routes/teamMeetRoutes.ts`
- **Issue:** Router-level authorize includes 9 of 11 roles (`ADMIN`, `COUNSELOR`, `SUPER_ADMIN`, `STUDENT`, `OPS`, `EDUPLAN_COACH`, `IVY_EXPERT`, `PARENT`, `REFERRER`). Any of these roles can create, cancel, accept, reject, reschedule, and complete team meetings. `GET /counselor/:counselorId` (described as "Admin-only") has no per-route restriction.
- **Impact:** Students, parents, referrers can create and manage meetings. Counselor meeting data exposed to all roles.

---

## Medium Issues (18)

### BUG-009: Ivy Service Details — No Authorization ⚠️ STILL OPEN
- **File:** `backend/src/routes/ivyService.routes.ts`
- **Issue:** `GET /api/ivy/ivy-service/:serviceId` accessible by any authenticated user.

### BUG-011: Document Upload — No Role Authorization ⚠️ STILL OPEN
- **File:** `backend/src/routes/documentRoutes.ts`
- **Issue:** `POST /api/documents/upload` has no `authorize()`. Any authenticated user can upload documents to any registration.

### BUG-019: Sensitive Fields Not Consistently Excluded ⚠️ STILL OPEN
- **File:** `backend/src/controllers/superAdminController.ts`
- **Issue:** Some queries exclude `-password` but not `otp`, `otpExpires`, `emailVerificationToken`. Inconsistent field exclusion.

### BUG-020: No CSRF Protection ⚠️ STILL OPEN
- **File:** `backend/src/server.ts`
- **Issue:** No CSRF protection middleware. Combined with wildcard CORS, this is exploitable.

### BUG-021: Race Condition in Form Answer Saves ⚠️ STILL OPEN
- **File:** `backend/src/controllers/formAnswerController.ts` (lines 87-110)
- **Issue:** Read-modify-write pattern without locking. Uses `findOne` then `save()` instead of atomic `findOneAndUpdate`. Concurrent saves can overwrite each other. The `guardNameFields` and `guardParentEntries` logic can be bypassed by concurrent requests.

### BUG-022: Race Condition in Document Upload ⚠️ STILL OPEN
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Non-atomic operations for single-file fields. Two simultaneous uploads can create duplicates.

### BUG-023: Enrollment Status — No State Machine Validation ⚠️ STILL OPEN
- **File:** `backend/src/controllers/enrollmentController.ts`
- **Issue:** Status can jump from `NOT_STARTED` → `COMPLETED` or go backwards. No valid transition logic exists.
- **Note:** enrollmentRoutes.ts is NOT mounted in server.ts (dead code), so this is currently unreachable. If ever mounted, it's exploitable.

### BUG-027: `readOnly` Query Param Client-Controlled ⚠️ STILL OPEN
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`, `frontend/src/app/ivy-league/student/useStudentService.ts`
- **Issue:** `readOnly` is entirely a URL query parameter (`?readOnly=true`) parsed client-side. No backend enforcement. Any user can remove it from the URL to get write access.
- **Impact:** Privilege escalation — users meant to view read-only data can write.

### BUG-028: Flash of Unauthorized Content ⚠️ STILL OPEN
- **Files:** All role-specific pages
- **Issue:** Client-side role checks in `useEffect` cause brief content flash before redirect. Page HTML and JS bundles served to any visitor.

### BUG-033: Pointer 1 Routes — Overly Permissive ⚠️ STILL OPEN
- **File:** `backend/src/routes/pointer1.routes.ts`
- **Issue:** STUDENT can delete academic sections/subsections/subjects/projects. Write/delete routes include ADMIN and COUNSELOR in addition to IVY_EXPERT/STUDENT/SUPER_ADMIN.

### BUG-034: ADMIN/COUNSELOR/PARENT Can See Any Student's Documents ⚠️ STILL OPEN
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Only STUDENT and OPS roles have ownership checks in `getDocuments`, `downloadDocument`, `viewDocument`. COUNSELOR, PARENT, ADMIN, and other roles fall through to the default case and are implicitly allowed access to any student's documents without relationship verification.

### BUG-035: Document Download — Same Data Isolation Issue ⚠️ STILL OPEN
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** Same problem as BUG-034 for `downloadDocument` and `viewDocument`.

### BUG-045: Document Upload — No Ownership Validation 🆕
- **File:** `backend/src/controllers/documentController.ts`
- **Issue:** `uploadDocument` verifies the registration exists but does not check that `req.user` is the student who owns the registration, or an assigned OPS. Any authenticated user can upload documents to any registration by providing a valid `registrationId`.

### BUG-046: Service Plan Routes — Missing Authorization 🆕
- **File:** `backend/src/routes/servicePlanRoutes.ts`
- **Issue:** `GET /student/:studentId/plan-tiers` and `GET /:serviceSlug/admin/:adminId/pricing` have no `authorize()`. Any authenticated user can query any student's plan tiers or any admin's pricing.

### BUG-047: Student Plan Discount Route — Missing Authorization 🆕
- **File:** `backend/src/routes/studentPlanDiscountRoutes.ts`
- **Issue:** `GET /student/:studentId` has no `authorize()`. Any authenticated user can view any student's discount information.

### BUG-048: Auth Routes — SP Profile Update Not Role-Restricted 🆕
- **File:** `backend/src/routes/authRoutes.ts`
- **Issue:** `PUT /sp-profile` has `authenticate` but no `authorize(USER_ROLE.SERVICE_PROVIDER)`. Any authenticated user can update service provider profile fields.

### BUG-049: Ivy League Student Pages — No Role Verification 🆕
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`
- **Issue:** Layout renders the full navigation sidebar without verifying the logged-in user's identity or role. No role gate exists — any authenticated user navigating to `/ivy-league/student/*` sees full content.

### BUG-050: Token Stored in localStorage 🆕
- **File:** `frontend/src/lib/api.ts` (line 16)
- **Issue:** JWT token stored in `localStorage`, making it accessible to any JavaScript running on the page. If XSS exists anywhere (e.g., via uploaded `.html` files served from `/uploads`), the token can be stolen.
- **Impact:** Combined with BUG-016 (unrestricted file uploads) and BUG-018 (public static serving), this creates a full XSS-to-account-takeover chain.

---

## Low Issues (10)

### BUG-024: Parent Sync Not Atomic ⚠️ STILL OPEN
- **File:** `backend/src/controllers/formAnswerController.ts`
- **Issue:** `syncParentsIfPresent` called after saving form answers. If sync fails, form is saved but parent records are inconsistent.

### BUG-026: Ivy League Student Layout — No Role Verification ⚠️ STILL OPEN
- **File:** `frontend/src/app/ivy-league/student/layout.tsx`
- **Issue:** No role check. Any user can navigate to `/ivy-league/student/*`.
- **Note:** Elevated to BUG-049 as Medium due to increased understanding of impact.

### BUG-029: PARENT Missing from Dashboard Redirect ✅ FIXED
- **File:** `frontend/src/app/dashboard/page.tsx`
- **Issue:** Dashboard redirect logic now handles ALL roles including PARENT, REFERRER, SERVICE_PROVIDER.

### BUG-030: Inconsistent Auth Redirect Destinations ⚠️ STILL OPEN
- **Files:** Various frontend pages
- **Issue:** Some pages redirect to `/login`, others to `/dashboard`, and student pages to `/student/registration`.

### BUG-036: `updateSPProfile` Uses Wrong Request Type ⚠️ STILL OPEN
- **File:** `backend/src/controllers/authController.ts`
- **Issue:** Uses `Request` instead of `AuthRequest`, then casts `req as any` to access `req.user`.

### BUG-051: Authorize Middleware Leaks User Role 🆕
- **File:** `backend/src/middleware/authorize.ts` (line 36)
- **Issue:** 403 response includes `"Your role: ${userRole}"`. An attacker probing endpoints can discover their assigned role and what roles each endpoint requires.

### BUG-052: Error Messages Leak Internal Details 🆕
- **Files:** `backend/src/controllers/formAnswerController.ts`, `backend/src/controllers/enrollmentController.ts`, multiple controllers
- **Issue:** `error.message` returned in 500 responses. Internal error messages could leak DB schema names, field names, and stack info.

### BUG-053: Coaching Batch List — No Authorization 🆕
- **File:** `backend/src/routes/coachingBatchRoutes.ts`
- **Issue:** `GET /` has no `authorize()`. Any authenticated user can list active batches.
- **Note:** Low risk — likely intentional for batch listing.

### BUG-054: No Centralized Auth State in Frontend 🆕
- **File:** Frontend (all pages)
- **Issue:** No shared `AuthProvider` context. Every page independently calls `authAPI.getProfile()` in its own `useEffect`. Redundant API calls and inconsistent auth state.

### BUG-055: Inconsistent `authorize()` Calling Conventions 🆕
- **Files:** Various route files
- **Issue:** Some routes use `authorize(ROLE)`, others `authorize([ROLE1, ROLE2])`, others `authorize(ROLE1, ROLE2)`. All work due to `.flat()`, but inconsistency increases risk of mistakes in future development.

---

## Removed / Reclassified Issues

### BUG-010: Enrollment Status Update — Missing Authorization → DEAD CODE
- **File:** `backend/src/routes/enrollmentRoutes.ts`
- **Status:** Route file is NOT imported or mounted in `server.ts`. These routes are unreachable. Still a risk if ever mounted.

### BUG-012: `isVerified` Check Commented Out → BY DESIGN
- **File:** `backend/src/middleware/auth.ts`
- **Status:** Intentionally disabled. Unverified users CAN sign in, but inactive users (`isActive: false`) cannot. The `isActive` check is enforced.

### BUG-032: Notification Routes — Missing `authenticate` → DEAD CODE
- **File:** `backend/src/routes/notification.routes.ts`
- **Status:** Route file is NOT imported or mounted in `server.ts`. Unreachable. Also has broken security model (`authorize()` without preceding `authenticate`).

### BUG-001: Ivy League Test Question Routes → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/ivyTestQuestion.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.SUPER_ADMIN)` at router level. All routes now restricted to SUPER_ADMIN only.

### BUG-002: Ivy League Test Session Routes → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/ivyTestSession.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.STUDENT)` at router level. All routes now restricted to STUDENT only.

### BUG-003: Activity Routes (Ivy) → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/activity.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.SUPER_ADMIN)` at router level. All routes now restricted to SUPER_ADMIN only.

### BUG-004: Excel Upload Route → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/excelUpload.routes.ts`
- **Fix:** Added `authorize(USER_ROLE.IVY_EXPERT)` on the POST route. Restricted to IVY_EXPERT only.

### BUG-008: Ivy League Admin Routes — No Route-Level Auth → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/ivyLeagueAdmin.routes.ts`
- **Fix:** Per-route authorization: SUPER_ADMIN only for stats, ivy-experts list, convert-to-student, assign-expert. SUPER_ADMIN + IVY_EXPERT for candidates, students, test-result, interview.

### BUG-031: Ivy League Admin Routes — No SUPER_ADMIN Authorization → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/ivyLeagueAdmin.routes.ts`
- **Fix:** Same as BUG-008. Per-route `authorize()` added with SUPER_ADMIN and IVY_EXPERT access.

### BUG-037: Activity Routes (Education Planning) → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/routes/activityRoutes.ts`
- **Fix:** Per-route `authorize()` with 3-way role split: read access for all associated roles (STUDENT, SUPER_ADMIN, EDUPLAN_COACH, OPS, COUNSELOR, ADMIN, PARENT, REFERRER); activity write (monthly focus, planner) for STUDENT only; feedback write/delete for SUPER_ADMIN and EDUPLAN_COACH only.

### BUG-038: Invoice Routes → BY DESIGN (Not a bug)
- **File:** `backend/src/routes/invoiceRoutes.ts`
- **Status:** Invoice data accessible by all authenticated users associated with the student. Intentional design.

### BUG-039: Ledger Routes → BY DESIGN (Not a bug)
- **File:** `backend/src/routes/ledgerRoutes.ts`
- **Status:** Ledger data accessible by all authenticated users associated with the student. Intentional design.

### BUG-014: No Rate Limiting on Any Endpoint → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/server.ts`
- **Fix:** Installed `express-rate-limit`. Applied 3-tier rate limiting: general API (100 req/15min), auth endpoints (20 req/15min), OTP verification (5 req/10min).

### BUG-015: CORS Allows All Origins → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/server.ts`
- **Fix:** Configured CORS whitelist: `localhost:3000`, `localhost:3001`, `https://core.admitra.io`, `https://temp-core.admitra.io` and www variants. Credentials enabled.

### BUG-013: OTP Logged to Console → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/controllers/authController.ts`
- **Fix:** Removed both `console.log("otp", otp)` statements from signup and login flows.

### BUG-042: OTP Brute Force → ✅ FIXED (April 6, 2026)
- **File:** `backend/src/utils/otp.ts`, `backend/src/server.ts`
- **Fix:** OTP upgraded from 4-digit to 6-digit (1,000,000 combinations). Rate limiter added: 5 attempts per 10 minutes on verify endpoints.

---

## Recommended Priority Actions

### Immediate (Before Production)
1. ~~**Remove OTP logging**~~ — ✅ DONE (BUG-013 fixed April 6, 2026)
2. ~~**Add `authorize()` to ALL Ivy League routes**~~ — ✅ DONE (BUG-001, 002, 003, 004, 005, 006, 007, 031 fixed April 6, 2026)
3. ~~**Add `authorize()` to remaining Ivy routes**~~ — ✅ DONE (admin.routes, user.routes, grammarCheck fixed April 6, 2026)
4. ~~**Add `authorize()` to activityRoutes**~~ — ✅ DONE (BUG-037 fixed April 6, 2026)
5. ~~**Implement rate limiting**~~ — ✅ DONE (BUG-014 fixed April 6, 2026)
6. ~~**Configure CORS whitelist**~~ — ✅ DONE (BUG-015 fixed April 6, 2026)
7. **Fix captcha validation** — validate server-side against a stored challenge (BUG-043)

### Short-Term
8. ~~**Add file type validation**~~ — ✅ DONE (BUG-016 fixed April 6, 2026)
9. **Protect static uploads directory** — add auth middleware or use signed URLs (BUG-018)
10. **Add security headers** via `helmet` middleware (BUG-041)
11. **Fix document data isolation** — verify PARENT/COUNSELOR/ADMIN ownership of specific student (BUG-034, 035, 045)
12. **Restrict SP profile update** to SERVICE_PROVIDER role (BUG-048)
13. **Add role checks to service plan and discount routes** (BUG-046, 047)
14. **Restrict team meet routes** — narrow role access for create/cancel/reschedule (BUG-044)

### Medium-Term
15. **Implement Next.js middleware** for server-side route protection (BUG-025)
16. **Add CSRF protection** (BUG-020)
17. **Add path traversal protection** on document serving (BUG-017)
18. **Fix race conditions** with optimistic locking or `findOneAndUpdate` (BUG-021, 022)
19. **Add atomic parent sync** with MongoDB transactions (BUG-024)
20. **Enforce `readOnly` server-side** on Ivy League routes (BUG-027)
21. **Add role verification** to Ivy League student pages (BUG-049)
22. **Consider httpOnly cookies** instead of localStorage for token (BUG-050)

### Security Attack Chain Warning
BUG-016 ~~(unrestricted file upload)~~ + BUG-018 (public static serving) + BUG-050 (localStorage token) = **Partial XSS-to-Account-Takeover chain**. BUG-016 is now fixed (file types restricted), but BUG-018 and BUG-050 remain.

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
| `parentRoutes.ts` | Per-route | Per-route | ✅ (broad roles) |
| `chatRoutes.ts` | Router-level | Per-route | ✅ (6 roles) |
| `teamMeetRoutes.ts` | Router-level | 9 roles | ⚠️ Too permissive |
| `serviceRoutes.ts` | Per-route | Per-route | ✅ |
| `formAnswerRoutes.ts` | Per-route | Per-route | ✅ |
| `programRoutes.ts` | Router-level | Per-route | ✅ |
| `documentRoutes.ts` | Router-level | PARTIAL | ⚠️ Upload/view/download unprotected |
| `coreDocumentRoutes.ts` | Router-level | Per-route | ✅ |
| `portfolioRoutes.ts` | Router-level | Per-route | ✅ |
| `brainographyRoutes.ts` | Router-level | Per-route | ✅ |
| `archiveRoutes.ts` | Router-level | Per-route | ✅ |
| `activityRoutes.ts` | Router-level | Per-route | ✅ Fixed (read/write role split) |
| `coachingBatchRoutes.ts` | Per-route | PARTIAL | ⚠️ GET / unprotected |
| `paymentRoutes.ts` | Per-route | PARTIAL | ❌ 6 routes unprotected |
| `servicePlanRoutes.ts` | Per-route | PARTIAL | ⚠️ 2 routes unprotected |
| `studentPlanDiscountRoutes.ts` | Per-route | PARTIAL | ⚠️ 1 route unprotected |
| `invoiceRoutes.ts` | Per-route | All auth users | ✅ By Design |
| `ledgerRoutes.ts` | Per-route | All auth users | ✅ By Design |
| `opsScheduleRoutes.ts` | Per-route + Router | Per-route | ✅ |
| `spDocumentRoutes.ts` | Router-level | Per-route | ✅ |
| `spServiceRoutes.ts` | Per-route | Per-route | ✅ |
| `ivyLeagueRegistrationRoutes.ts` | Per-route | STUDENT | ✅ |
| `ivyLeagueAdmin.routes.ts` | App-level | SUPER_ADMIN | ✅ Fixed |
| `ivyTestQuestion.routes.ts` | App-level | SUPER_ADMIN | ✅ Fixed |
| `ivyTestSession.routes.ts` | App-level | STUDENT | ✅ Fixed |
| `activity.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ Fixed |
| `excelUpload.routes.ts` | App-level | IVY_EXPERT | ✅ Fixed |
| `admin.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ Fixed (dead route) |
| `user.routes.ts` (Ivy) | App-level | SUPER_ADMIN | ✅ Fixed (dead route) |
| `grammarCheck.routes.ts` | App-level | IVY_EXPERT | ✅ Fixed |
| `ivyService.routes.ts` | App-level | PARTIAL | ⚠️ 1 route unprotected |
| `ivyScore.routes.ts` | App-level | Per-route | ✅ |
| `ivyExpertCandidate.routes.ts` | App-level | Per-route | ✅ |
| `pointer1.routes.ts` | App-level | Per-route | ✅ (broad roles) |
| `pointer5.routes.ts` | App-level | Per-route | ✅ |
| `pointer6.routes.ts` | App-level | Per-route | ✅ |
| `pointer234Activity.routes.ts` | App-level | Per-route | ✅ |
| `pointerActivity.routes.ts` | App-level | Per-route | ✅ |
| `taskConversation.routes.ts` | App-level | Per-route | ✅ |
| `agentSuggestion.routes.ts` | App-level | Per-route | ✅ |
| `studentInterest.routes.ts` | App-level | Per-route | ✅ |
| `enrollmentRoutes.ts` | Router-level | PARTIAL | ⚪ DEAD CODE (not mounted) |
| `notification.routes.ts` | **NO** | Per-route | ⚪ DEAD CODE (not mounted) |

---

*Report re-analyzed: April 2026*  
*Last fixes applied: April 6, 2026*  
*Previous analysis: March 2026*  
*CORE Bug Analysis — Kareer Studio*
