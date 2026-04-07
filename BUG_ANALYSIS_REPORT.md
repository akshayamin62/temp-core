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
| **Medium** | 0 |
| **Low** | 8 |
| **Total** | 8 |

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
| BUG-027 | readOnly client-controlled | ✅ Fixed (removed ADMIN/COUNSELOR from all Ivy write routes) |
| BUG-046 | Service plan routes no authorize | ✅ Fixed (authorize with connected roles) |
| BUG-047 | Student plan discount no authorize | ✅ Fixed (authorize with connected roles) |
| BUG-048 | SP profile update not role-restricted | ✅ Fixed (authorize SERVICE_PROVIDER) |
| BUG-049 | Ivy League pages no role verification | ✅ Fixed (role gate in layout) |
| BUG-051 | Authorize middleware leaks user role | ✅ Fixed (generic 403 message) |
| BUG-052 | Error messages leak internal details | ✅ Fixed (generic error messages in all controllers) |

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

### BUG-053: Coaching Batch List — No Authorization ⚠️
- **File:** `backend/src/routes/coachingBatchRoutes.ts`
- **Issue:** `GET /` has no `authorize()`. Any authenticated user can list active batches. Low risk — likely intentional.

---

## Recommended Priority Actions

### Next (Short-Term)
1. **Add atomic parent sync** with MongoDB transactions (BUG-024)
2. **Consider httpOnly cookies** instead of localStorage for token (BUG-050)

### Low Priority (Code Quality)
3. **Fix SP profile request type** (BUG-036)
4. **Standardize redirect destinations** (BUG-030)
5. **Reduce content flash** on page load (BUG-028)

---

## Route Authorization Summary Table

| Route File | authenticate | authorize | Status |
|---|---|---|---|
| `authRoutes.ts` | Per-route | Per-route | ✅ Fixed |
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
| `servicePlanRoutes.ts` | Per-route | Per-route | ✅ Fixed |
| `studentPlanDiscountRoutes.ts` | Per-route | Per-route | ✅ Fixed |
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
