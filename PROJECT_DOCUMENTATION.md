# KAREER STUDIO — Complete Project Documentation

## CORE – Centralized Operation & Readiness Eco-system (Powered by ADMITra)

**Version:** 1.0.0  
**Last Updated:** February 8, 2026  
**Purpose:** A comprehensive educational services management platform with CRM, dynamic form generation, student registration, document management, and scheduling.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Database Architecture (25 Models)](#5-database-architecture-25-models)
6. [Backend API (132 Endpoints)](#6-backend-api-132-endpoints)
7. [Middleware Layer](#7-middleware-layer)
8. [Utility Functions](#8-utility-functions)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Frontend Pages (40+ Routes)](#10-frontend-pages-40-routes)
11. [Frontend Components (35 Components)](#11-frontend-components-35-components)
12. [Core Business Flows](#12-core-business-flows)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Environment Configuration](#14-environment-configuration)
15. [Deployment](#15-deployment)

---

## 1. Project Overview

Kareer Studio is a **multi-tenant educational services platform** that manages the complete lifecycle from lead capture to student enrollment, form filling, document management, and program application tracking.

### Key Capabilities
- **CRM System**: Lead capture via public enquiry forms → counselor follow-ups → conversion to students
- **Multi-Role Management**: 10 distinct user roles with role-based access control
- **Service-Based Registration**: Students register for services (Study Abroad, IELTS, GRE, Ivy League, Education Planning)
- **Dynamic Form System**: 4-level hierarchical forms (Parts → Sections → SubSections → Fields) driven by database
- **Document Management**: Upload, versioning, approval/rejection workflows
- **Program Tracking**: University program suggestions, student selection, chat per program
- **Scheduling**: Follow-up calendars, team meetings, OPS task scheduling
- **OTP-Based Auth**: Passwordless authentication via email OTP

### Business Flow Summary
```
Public Enquiry Form → Lead (in CRM)
  → Counselor Follow-ups (calls/meetings)
  → Lead-to-Student Conversion (counselor requests → admin approves)
    → Student Account Created
    → Student Registers for Service(s)
      → Multi-step Form Filling (Profile / Application / Documents / Payment)
      → Document Uploads (pending → approved/rejected)
      → Program Selection & Chat
      → Staff Assignment (OPS / Ivy Expert / Eduplan Coach)
```

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime |
| Express | 5.2.1 | HTTP framework |
| TypeScript | 5.9.3 | Type safety |
| MongoDB | — | Database |
| Mongoose | 8.21.0 | ODM |
| JWT (jsonwebtoken) | 9.0.3 | Authentication tokens |
| bcrypt / bcryptjs | 6.0.0 / 3.0.3 | Password/OTP hashing |
| Nodemailer | 7.0.12 | Email sending (Gmail) |
| Multer | 2.0.2 | File uploads |
| xlsx | 0.18.5 | Excel file parsing |
| Axios | 1.13.2 | HTTP client (Zoho API) |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | React framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.1.18 | Styling |
| Axios | 1.13.2 | API client |
| Framer Motion | 12.27.5 | Animations |
| Lucide React | 0.562.0 | Icons |
| react-big-calendar | 1.19.4 | Calendar views |
| date-fns | 4.1.0 | Date utilities |
| react-hot-toast | 2.6.0 | Toast notifications |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                      │
│   Port 3000 | App Router | 40+ pages | 35 components             │
│   Tailwind CSS | Axios API Client | react-big-calendar            │
└─────────────────────────────┬────────────────────────────────────┘
                              │ REST API (JSON + Multipart)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express 5 + TS)                    │
│   Port 5000 | 132 API endpoints | 18 controllers                 │
│   JWT Auth | Role-based middleware | File uploads                 │
├──────────────────────────────────────────────────────────────────┤
│   Middleware:  authenticate → authorize → validate → upload       │
├──────────────────────────────────────────────────────────────────┤
│   Utils:  jwt | otp | email (nodemailer) | zohoMeeting            │
└─────────────────────────────┬────────────────────────────────────┘
                              │ Mongoose ODM
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     MongoDB (25 Collections)                      │
│   Users, Students, Admins, Counselors, Ops, Leads,               │
│   Services, Forms (Part/Section/SubSection/Field),                │
│   Registrations, FormAnswers, Documents, Programs, Chats, etc.    │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Gmail SMTP     Zoho Meeting     File Storage
        (Nodemailer)     (OAuth2 API)     (uploads/)
```

---

## 4. User Roles & Permissions

### 10 Roles Defined in `USER_ROLE` Enum

| Role | Auto-Verify on Signup | Needs Admin Approval | Dashboard Route | Can Self-Signup |
|---|---|---|---|---|
| **SUPER_ADMIN** | Manual creation | N/A | `/super-admin/dashboard` | No |
| **ADMIN** | No | Created by Super Admin | `/admin/dashboard` | No |
| **COUNSELOR** | No | Created by Admin | `/counselor/dashboard` | No |
| **OPS** | No | Created by Super Admin | `/ops/dashboard` | No |
| **STUDENT** | Yes (auto) | No | `/dashboard` | Yes |
| **PARENT** | No | Yes | N/A | No (blocked) |
| **ALUMNI** | No | Yes | `/dashboard` | Yes |
| **SERVICE_PROVIDER** | No | Yes | `/dashboard` | Yes |
| **EDUPLAN_COACH** | No | Created by Super Admin | N/A (managed) | No |
| **IVY_EXPERT** | No | Created by Super Admin | N/A (managed) | No |

### Permission Matrix

| Feature | Student | Counselor | OPS | Admin | Super Admin |
|---|---|---|---|---|---|
| Register for services | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill service forms | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own registrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload documents | ✅ | ❌ | ✅ | ❌ | ✅ |
| Approve/reject documents | ❌ | ❌ | ✅ | ❌ | ✅ |
| View assigned students | ❌ | ✅ (own) | ✅ (assigned) | ✅ (own org) | ✅ (all) |
| Manage leads | ❌ | ✅ (assigned) | ❌ | ✅ (own org) | ✅ (all) |
| Request lead→student conversion | ❌ | ✅ | ❌ | ❌ | ❌ |
| Approve lead→student conversion | ❌ | ❌ | ❌ | ✅ | ❌ |
| Schedule follow-ups | ❌ | ✅ | ❌ | ✅ | ❌ |
| Schedule team meets | ❌ | ✅ | ❌ | ✅ | ✅ |
| OPS schedule (tasks) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create programs | ✅ | ❌ | ✅ | ❌ | ✅ |
| Upload programs (Excel) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Program chat | ✅ (open) | ✅ | ✅ | ✅ | ✅ |
| Create counselors | ❌ | ❌ | ❌ | ✅ | ❌ |
| Create OPS/Admin/roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve/reject users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign staff to students | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Database Architecture (25 Models)

### Model Relationship Diagram

```
                                    ┌─────────────┐
                                    │    User      │ ← Central identity (10 roles)
                                    │  (email,role │
                                    │  otp,verify) │
                                    └──────┬───────┘
                     ┌──────┬──────┬───────┼───────┬──────┬──────┐
                     ▼      ▼      ▼       ▼       ▼      ▼      ▼
                  Student  Admin  Counselor Ops  IvyExpert EduplanCoach
                     │       │       │       │
                     │       │       │       └── OpsSchedule
                     │       │       │
                     │       │       ├── FollowUp ← Lead follow-up calls
                     │       │       │
                     │       ├── Lead ← CRM entity (enquiry form)
                     │       │    │
                     │       │    └── LeadStudentConversion (approval workflow)
                     │       │
                     │       └── TeamMeet (internal meetings)
                     │
         ┌───────────┼───────────────────────┐
         ▼           ▼                       ▼
   StudentService   StudentForm         StudentDocument
   Registration      Answer             COREDocumentField
    (per service)   (per part)          (per registration)
         │
         ├── Program ── ProgramChat ── ChatMessage
         │
    Service ←── ServiceFormPart ──→ FormPart
                                      │
                                   FormSection
                                      │
                                   FormSubSection (repeatable)
                                      │
                                   FormField (13 types)
```

### All 25 Models — Detailed Schema

#### 5.1 User
| Field | Type | Notes |
|---|---|---|
| firstName | String | Required |
| middleName | String | Optional |
| lastName | String | Required |
| email | String | Required, unique, lowercase |
| role | Enum | STUDENT, PARENT, OPS, COUNSELOR, EDUPLAN_COACH, IVY_EXPERT, ADMIN, ALUMNI, SUPER_ADMIN, SERVICE_PROVIDER |
| isVerified | Boolean | Default false — email verified + admin approved |
| isActive | Boolean | Default true — can be deactivated |
| otp | String | Temporary, hashed (base64) |
| otpExpires | Date | OTP expiration (10 min) |

**Central identity table.** No password field — fully OTP-based auth.

#### 5.2 Student
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| adminId | ObjectId → Admin | Optional — which admin org owns this student |
| counselorId | ObjectId → Counselor | Optional — assigned counselor |
| email | String | Optional |
| mobileNumber | String | Optional |
| convertedFromLeadId | ObjectId → Lead | Optional — lead conversion tracking |
| conversionDate | Date | Optional |

#### 5.3 Admin
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| email | String | Required, unique |
| mobileNumber | String | Optional, regex validated |
| companyName | String | Required |
| address | String | Optional |
| companyLogo | String | Optional (file path) |
| enquiryFormSlug | String | Required, unique — used for public enquiry form URL |

**Represents a company/organization.** Multi-tenant anchor.

#### 5.4 Counselor
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| adminId | ObjectId → User | Required — belongs to admin org |
| email | String | Required, unique |
| mobileNumber | String | Optional |

#### 5.5 Ops
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| email | String | Required, unique |
| mobileNumber | String | Optional |

**Operations staff** for Study Abroad service management.

#### 5.6 EduplanCoach
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| email | String | Required, unique |
| mobileNumber | String | Optional |

**Education Planning coaches** assigned to students.

#### 5.7 IvyExpert
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | Required, unique |
| email | String | Required, unique |
| mobileNumber | String | Optional |

**Ivy League admission experts** assigned to students.

#### 5.8 Lead
| Field | Type | Notes |
|---|---|---|
| name | String | Required |
| email | String | Required |
| mobileNumber | String | Required |
| city | String | Required |
| serviceTypes | [String] | Enum: Education Planning, Career Focus Study Abroad, Ivy League Admission, IELTS/GRE/Language Coaching |
| adminId | ObjectId → User | Required — scoped to admin org |
| assignedCounselorId | ObjectId → Counselor | Optional |
| stage | Enum | NEW, HOT, WARM, COLD, CONVERTED_TO_STUDENT, CLOSED |
| source | String | Default "Enquiry Form" |
| conversionRequestId | ObjectId → LeadStudentConversion | Optional |
| conversionStatus | Enum | PENDING, APPROVED, REJECTED |

**Indexes:** `{adminId, stage}`, `{assignedCounselorId, stage}`, `{email, adminId}`

#### 5.9 LeadStudentConversion
| Field | Type | Notes |
|---|---|---|
| leadId | ObjectId → Lead | Required |
| requestedBy | ObjectId → User | Counselor who requested |
| adminId | ObjectId → Admin | Required |
| status | Enum | PENDING, APPROVED, REJECTED |
| rejectionReason | String | Optional |
| approvedBy / rejectedBy | ObjectId → User | Optional |
| createdStudentId | ObjectId → Student | Created on approval |

**Approval workflow:** Counselor requests → Admin approves/rejects → Student created.

#### 5.10 Service
| Field | Type | Notes |
|---|---|---|
| name | String | Required, unique |
| slug | String | Required, unique, lowercase |
| description | String | Required |
| shortDescription | String | Required |
| icon | String | Optional |
| learnMoreUrl | String | Optional |
| isActive | Boolean | Default true |
| order | Number | Display ordering |

**Services:** Study Abroad, IELTS Preparation, GRE Preparation, Ivy League Admissions, Education Planning.

#### 5.11 FormPart
| Field | Type | Notes |
|---|---|---|
| key | String | Unique — PROFILE, APPLICATION, DOCUMENT, PAYMENT |
| title | String | Required |
| description | String | Optional |
| order | Number | Required |
| isActive | Boolean | Default true |

**Top level** of the 4-tier form hierarchy. Reusable across services.

#### 5.12 ServiceFormPart
| Field | Type | Notes |
|---|---|---|
| serviceId | ObjectId → Service | Required |
| partId | ObjectId → FormPart | Required |
| order | Number | Required |
| isActive | Boolean | Default true |
| isRequired | Boolean | Default true |

**Junction table** — links Services to FormParts. Unique `{serviceId, partId}`.

#### 5.13 FormSection
| Field | Type | Notes |
|---|---|---|
| partId | ObjectId → FormPart | Required |
| title | String | Required |
| description | String | Optional |
| order | Number | Required |
| isActive | Boolean | Default true |

**Second level** — sections within a part (e.g., Personal Info, Education, Work Experience).

#### 5.14 FormSubSection
| Field | Type | Notes |
|---|---|---|
| sectionId | ObjectId → FormSection | Required |
| title | String | Required |
| description | String | Optional |
| order | Number | Required |
| isRepeatable | Boolean | Default false |
| maxRepeat | Number | Optional |
| isActive | Boolean | Default true |

**Third level** — supports repeatable entries (e.g., add multiple education records).

#### 5.15 FormField
| Field | Type | Notes |
|---|---|---|
| subSectionId | ObjectId → FormSubSection | Required |
| label | String | Required |
| key | String | Required |
| type | Enum | TEXT, EMAIL, NUMBER, DATE, PHONE, TEXTAREA, SELECT, RADIO, CHECKBOX, FILE, COUNTRY, STATE, CITY |
| placeholder | String | Optional |
| helpText | String | Optional |
| required | Boolean | Default false |
| order | Number | Required |
| isActive | Boolean | Default true |
| validation | Object | `{min, max, pattern, message}` |
| options | Array | `[{label, value}]` for select/radio/checkbox |
| defaultValue | Mixed | Optional |

**Leaf node** — 13 field types with validation and options. Location cascading (COUNTRY → STATE → CITY).

#### 5.16 StudentServiceRegistration
| Field | Type | Notes |
|---|---|---|
| studentId | ObjectId → Student | Required |
| serviceId | ObjectId → Service | Required |
| primaryOpsId | ObjectId → Ops | Optional |
| secondaryOpsId | ObjectId → Ops | Optional |
| activeOpsId | ObjectId → Ops | Optional |
| primaryIvyExpertId | ObjectId → IvyExpert | Optional |
| secondaryIvyExpertId | ObjectId → IvyExpert | Optional |
| activeIvyExpertId | ObjectId → IvyExpert | Optional |
| primaryEduplanCoachId | ObjectId → EduplanCoach | Optional |
| secondaryEduplanCoachId | ObjectId → EduplanCoach | Optional |
| activeEduplanCoachId | ObjectId → EduplanCoach | Optional |
| status | Enum | REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED |
| registeredAt | Date | Default now |
| completedAt | Date | Optional |
| cancelledAt | Date | Optional |
| paymentStatus | String | Optional |
| paymentAmount | Number | Optional |
| notes | String | Optional |

**Unique:** `{studentId, serviceId}`. Uses **primary/secondary/active pattern** for staff assignment by service type.

#### 5.17 StudentFormAnswer
| Field | Type | Notes |
|---|---|---|
| studentId | ObjectId → Student | Required |
| partKey | String | Required (PROFILE, APPLICATION, etc.) |
| answers | Mixed | Flexible JSON blob `{}` |
| lastSavedAt | Date | Default now |

**Unique:** `{studentId, partKey}`. One document per student per part — **answers reusable across services**.

#### 5.18 StudentDocument
| Field | Type | Notes |
|---|---|---|
| registrationId | ObjectId → Registration | Required |
| studentId | ObjectId → Student | Required |
| documentCategory | Enum | PRIMARY, SECONDARY |
| documentName | String | Required |
| documentKey | String | Required |
| fileName / filePath / fileSize / mimeType | Various | File metadata |
| uploadedBy | ObjectId → User | Required |
| uploadedByRole | Enum | STUDENT, OPS, SUPER_ADMIN |
| status | Enum | PENDING, APPROVED, REJECTED |
| approvedBy / rejectedBy | ObjectId → User | Optional |
| version | Number | Default 1 |
| isCustomField | Boolean | Default false |

**File approval workflow:** PENDING → APPROVED / REJECTED. Auto-approved when uploaded by OPS/Super Admin.

#### 5.19 COREDocumentField
| Field | Type | Notes |
|---|---|---|
| studentId | ObjectId → Student | Required |
| registrationId | ObjectId → Registration | Required |
| documentName | String | Required |
| documentKey | String | Required |
| documentType | Enum | CORE, EXTRA |
| category | Enum | PRIMARY, SECONDARY |
| required | Boolean | Default false |
| allowMultiple | Boolean | Default false |
| createdBy | ObjectId → User | Required |
| createdByRole | Enum | SUPER_ADMIN, OPS |

**Per-student document field definitions.** CORE = standard; EXTRA = dynamically added per student.

#### 5.20 Program
| Field | Type | Notes |
|---|---|---|
| createdBy | ObjectId → User | Required |
| studentId | ObjectId → Student | Optional |
| university | String | Required |
| universityRanking | Object | `{webometricsWorld, webometricsNational, usNews, qs}` |
| programName | String | Required |
| programUrl | String | Required |
| campus | String | Optional |
| country | String | Required |
| studyLevel | String | Required |
| duration | Number | Months |
| ieltsScore | Number | Optional |
| applicationFee / yearlyTuitionFees | Number | GBP |
| priority | Number | Student-set |
| intake / year | String | Student-set |
| isSelectedByStudent | Boolean | Default false |

#### 5.21 ProgramChat
| Field | Type | Notes |
|---|---|---|
| programId | ObjectId → Program | Required |
| studentId | ObjectId → Student | Required |
| chatType | Enum | 'open' (all), 'private' (no students) |
| participants | Object | `{student, OPS, superAdmin, admin, counselor}` → User refs |

**Unique:** `{programId, studentId, chatType}`. One chat per program per student per type.

#### 5.22 ChatMessage
| Field | Type | Notes |
|---|---|---|
| chatId | ObjectId → ProgramChat | Required |
| senderId | ObjectId → User | Required |
| senderRole | Enum | STUDENT, OPS, SUPER_ADMIN, ADMIN, COUNSELOR |
| opsType | Enum | PRIMARY, ACTIVE (for OPS only) |
| message | String | Required |
| timestamp | Date | Default now |
| readBy | [ObjectId] → User | Read receipts |

#### 5.23 FollowUp
| Field | Type | Notes |
|---|---|---|
| leadId | ObjectId → Lead | Required |
| counselorId | ObjectId → Counselor | Required |
| scheduledDate | Date | Required |
| scheduledTime | String | HH:mm format |
| duration | Enum | 15, 30, 45, 60 minutes |
| meetingType | Enum | Online, Face to Face |
| zohoMeetingKey / zohoMeetingUrl | String | Zoho integration |
| status | Enum | 21 detailed statuses (Scheduled, Call Not Answered, Phone Switched Off, etc.) |
| stageAtFollowUp | Enum | Lead stage at time of follow-up |
| stageChangedTo | Enum | If lead stage changed |
| followUpNumber | Number | Sequential per lead |

**21 follow-up statuses** for granular call outcome tracking. Zoho Meeting integration for online calls.

#### 5.24 TeamMeet
| Field | Type | Notes |
|---|---|---|
| subject | String | Required, max 200 chars |
| scheduledDate / scheduledTime | Date / String | Required |
| duration | Enum | 15, 30, 45, 60 minutes |
| meetingType | Enum | ONLINE, FACE_TO_FACE |
| zohoMeetingKey / zohoMeetingUrl | String | Optional |
| requestedBy / requestedTo | ObjectId → User | Required |
| adminId | ObjectId → User | Org scoping |
| status | Enum | PENDING_CONFIRMATION, CONFIRMED, REJECTED, CANCELLED, COMPLETED |
| rejectionMessage | String | Optional |

**Internal team meeting scheduling** with invitation workflow.

#### 5.25 OpsSchedule
| Field | Type | Notes |
|---|---|---|
| opsId | ObjectId → Ops | Required |
| studentId | ObjectId → Student | Optional (null = "Me" task) |
| scheduledDate | Date | Required |
| scheduledTime | String | HH:mm format |
| description | String | Required |
| status | Enum | SCHEDULED, COMPLETED, MISSED |

**OPS daily task scheduler.** Supports self-tasks and student-specific tasks.

---

## 6. Backend API (132 Endpoints)

### 6.1 Authentication (`/api/auth`) — 5 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | ❌ | Register + send OTP (captcha validated) |
| POST | `/verify-signup-otp` | ❌ | Verify signup OTP → auto-verify students |
| POST | `/login` | ❌ | Request login OTP |
| POST | `/verify-otp` | ❌ | Verify login OTP → JWT token |
| GET | `/profile` | ✅ | Get current user profile |

### 6.2 Admin (`/api/admin`) — 6 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/counselor` | ✅ ADMIN | Create counselor |
| GET | `/counselors` | ✅ ADMIN | List own counselors |
| GET | `/counselor/:id` | ✅ ADMIN | Counselor detail + leads |
| GET | `/counselor/:id/follow-ups` | ✅ ADMIN | Counselor's follow-ups |
| GET | `/counselor/:id/follow-up-summary` | ✅ ADMIN | Follow-up summary (today/missed/upcoming) |
| PATCH | `/counselor/:id/toggle-status` | ✅ ADMIN | Activate/deactivate counselor |

### 6.3 Admin Students (`/api/admin/students`) — 4 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | List students under admin |
| GET | `/by-lead/:leadId` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Find student by lead ID |
| GET | `/:studentId` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Student details |
| GET | `/:studentId/registrations/:regId/answers` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Form answers (read-only) |

### 6.4 Super Admin (`/api/super-admin`) — 24 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users` | ✅ SUPER_ADMIN | All users with filters |
| GET | `/stats` | ✅ SUPER_ADMIN | User count by role |
| GET | `/pending` | ✅ SUPER_ADMIN | Pending approval users |
| POST | `/users/:id/approve` | ✅ SUPER_ADMIN | Approve user |
| POST | `/users/:id/reject` | ✅ SUPER_ADMIN | Reject & delete user |
| PATCH | `/users/:id/toggle-status` | ✅ SUPER_ADMIN | Toggle active status |
| POST | `/ops` | ✅ SUPER_ADMIN | Create OPS user |
| GET | `/ops` | ✅ SUPER_ADMIN | List all OPS |
| GET | `/ivy-experts` | ✅ SUPER_ADMIN | List all Ivy Experts |
| GET | `/eduplan-coaches` | ✅ SUPER_ADMIN | List all Eduplan Coaches |
| POST | `/admin` | ✅ SUPER_ADMIN | Create admin + company |
| GET | `/admins` | ✅ SUPER_ADMIN | List active admins |
| GET | `/admins/:id` | ✅ SUPER_ADMIN | Admin detail |
| GET | `/admins/:id/dashboard` | ✅ SUPER_ADMIN | Admin's dashboard stats |
| GET | `/admins/:id/counselors` | ✅ SUPER_ADMIN | Admin's counselors |
| GET | `/admins/:id/leads` | ✅ SUPER_ADMIN | Admin's leads |
| GET | `/admins/:id/students` | ✅ SUPER_ADMIN | Admin's students |
| GET | `/admins/:id/team-meets` | ✅ SUPER_ADMIN | Admin's team meetings |
| GET | `/leads` | ✅ SUPER_ADMIN | All leads globally |
| GET | `/counselors/:id/dashboard` | ✅ SUPER_ADMIN | Counselor detail |
| GET | `/counselors/:id/follow-ups` | ✅ SUPER_ADMIN | Counselor's follow-ups |
| GET | `/counselors/:id/follow-up-summary` | ✅ SUPER_ADMIN | Counselor follow-up summary |
| GET | `/counselors/:id/team-meets` | ✅ SUPER_ADMIN | Counselor's team meets |
| POST | `/user` | ✅ SUPER_ADMIN | Generic role creation (with logo upload) |

### 6.5 Super Admin Students (`/api/super-admin/students`) — 7 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ✅ SUPER_ADMIN/OPS | All students (OPS sees assigned only) |
| GET | `/with-registrations` | ✅ SUPER_ADMIN/OPS | Students filtered by service |
| GET | `/:studentId` | ✅ SUPER_ADMIN/OPS | Student details + registrations |
| GET | `/:studentId/registrations/:regId/answers` | ✅ SUPER_ADMIN/OPS | Form answers |
| PUT | `/:studentId/answers/:partKey` | ✅ SUPER_ADMIN/OPS | Edit form answers |
| POST | `/registrations/:regId/assign-ops` | ✅ SUPER_ADMIN | Assign OPS/IvyExpert/EduplanCoach |
| POST | `/registrations/:regId/switch-active-ops` | ✅ SUPER_ADMIN | Switch active between primary/secondary |

### 6.6 Student (`/api/student`) — 3 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/profile` | ✅ | Get student profile (auto-create if missing) |
| PUT | `/profile` | ✅ | Update profile |
| DELETE | `/profile` | ✅ | Delete profile |

### 6.7 Services (`/api/services`) — 5 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/services` | ❌ Public | List all active services |
| GET | `/services/:id/form` | ❌ Public | Full hierarchical form structure |
| GET | `/my-services` | ✅ | Student's registrations |
| POST | `/register` | ✅ | Register for a service |
| GET | `/registrations/:id` | ✅ | Registration details |

### 6.8 Form Answers (`/api/forms`) — 4 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/save` | ✅ | Save form answers (auto-save) |
| GET | `/registrations/:regId/answers` | ✅ | Get saved answers |
| GET | `/registrations/:regId/progress` | ✅ | Completion progress |
| DELETE | `/answers/:id` | ✅ | Delete answers |

### 6.9 Leads (`/api`) — 11 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/public/enquiry/:slug/info` | ❌ Public | Admin info for enquiry form |
| POST | `/public/enquiry/:slug/submit` | ❌ Public | Submit enquiry (create lead) |
| GET | `/admin/leads` | ✅ ADMIN | Admin's leads with filters |
| GET | `/admin/enquiry-form-url` | ✅ ADMIN | Get admin's enquiry slug |
| GET | `/admin/counselors` | ✅ ADMIN | Counselors for assignment dropdown |
| POST | `/admin/leads/:id/assign` | ✅ ADMIN | Assign lead to counselor |
| GET | `/counselor/leads` | ✅ COUNSELOR | Counselor's assigned leads |
| GET | `/counselor/enquiry-form-url` | ✅ COUNSELOR | Get admin's enquiry slug |
| GET | `/leads/:id` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Lead detail |
| PATCH | `/leads/:id/stage` | ✅ ADMIN/COUNSELOR | Update lead stage |
| GET | `/super-admin/leads` | ✅ SUPER_ADMIN | All leads globally |

### 6.10 Lead-Student Conversion (`/api/lead-conversions`) — 6 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/request/:leadId` | ✅ COUNSELOR | Request conversion |
| GET | `/pending` | ✅ ADMIN | Pending conversion requests |
| POST | `/approve/:id` | ✅ ADMIN | Approve → create student |
| POST | `/reject/:id` | ✅ ADMIN | Reject with reason |
| GET | `/history/:leadId` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Conversion attempts |
| GET | `/all` | ✅ SUPER_ADMIN | All conversions |

### 6.11 Programs (`/api/programs`) — 14 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/student/programs` | ✅ STUDENT | Student's available + applied programs |
| POST | `/student/programs/select` | ✅ STUDENT | Select/apply to program |
| POST | `/student/programs/create` | ✅ STUDENT | Create program |
| DELETE | `/student/programs/:id` | ✅ STUDENT | Remove from applied |
| GET | `/ops/programs` | ✅ OPS | OPS-created programs |
| GET | `/ops/student/:id/programs` | ✅ OPS/ADMIN/COUNSELOR | Student's programs |
| POST | `/ops/programs` | ✅ OPS | Create program |
| POST | `/ops/student/:id/programs` | ✅ OPS | Create for specific student |
| POST | `/ops/programs/upload-excel` | ✅ OPS | Bulk upload from Excel |
| POST | `/ops/student/:id/programs/upload-excel` | ✅ OPS | Bulk upload for student |
| GET | `/super-admin/student/:id/programs` | ✅ SUPER_ADMIN | All programs for student |
| GET | `/super-admin/student/:id/applied-programs` | ✅ SUPER_ADMIN | Applied programs only |
| POST | `/super-admin/programs/create` | ✅ SUPER_ADMIN | Create program |
| PUT | `/super-admin/programs/:id/selection` | ✅ SUPER_ADMIN | Update selection details |

### 6.12 Chat (`/api/chat`) — 4 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/my-chats` | ✅ | List user's chats |
| GET | `/program/:id/chat` | ✅ | Get/create program chat |
| GET | `/program/:id/messages` | ✅ | Get messages |
| POST | `/program/:id/messages` | ✅ | Send message |

### 6.13 Documents (`/api/documents`) — 10 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/fields/list` | ✅ | List document type fields |
| POST | `/fields/add` | ✅ SUPER_ADMIN/OPS | Add document field |
| DELETE | `/fields/:id` | ✅ SUPER_ADMIN | Delete document field |
| POST | `/upload` | ✅ | Upload document (multipart) |
| GET | `/:regId` | ✅ | Get documents for registration |
| GET | `/:id/view` | ✅ | Inline view document |
| GET | `/:id/download` | ✅ | Download document |
| PUT | `/:id/approve` | ✅ | Approve document |
| PUT | `/:id/reject` | ✅ | Reject document |
| DELETE | `/:id` | ✅ | Delete document |

### 6.14 CORE Documents (`/api/core-documents`) — 3 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/:regId` | ✅ | Get CORE document fields |
| POST | `/add` | ✅ SUPER_ADMIN/OPS | Add CORE document field |
| DELETE | `/:id` | ✅ SUPER_ADMIN/OPS | Delete CORE document field |

### 6.15 Follow-Ups (`/api/follow-ups`) — 7 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | ✅ COUNSELOR/ADMIN | Create follow-up |
| GET | `/` | ✅ COUNSELOR | List follow-ups |
| GET | `/summary` | ✅ COUNSELOR | Today/missed/upcoming summary |
| GET | `/check-availability` | ✅ COUNSELOR/ADMIN | Check time slot |
| GET | `/lead/:id/history` | ✅ COUNSELOR/ADMIN/SUPER_ADMIN | Lead's follow-up history |
| GET | `/:id` | ✅ COUNSELOR/ADMIN/SUPER_ADMIN | Follow-up detail |
| PATCH | `/:id` | ✅ COUNSELOR/ADMIN | Complete/reschedule |

### 6.16 Team Meets (`/api/team-meets`) — 12 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | ✅ ADMIN/COUNSELOR/SUPER_ADMIN | Create meeting |
| GET | `/` | ✅ | List meetings |
| GET | `/calendar` | ✅ | Calendar view data |
| GET | `/check-availability` | ✅ | Check availability |
| GET | `/participants` | ✅ | Available participants |
| GET | `/:id` | ✅ | Meeting detail |
| PATCH | `/:id/accept` | ✅ | Accept meeting |
| PATCH | `/:id/reject` | ✅ | Reject meeting |
| PATCH | `/:id/cancel` | ✅ | Cancel meeting |
| PATCH | `/:id/reschedule` | ✅ | Reschedule meeting |
| PATCH | `/:id/complete` | ✅ | Mark complete |
| GET | `/counselor/:id` | ✅ | Counselor's meetings |

### 6.17 OPS Schedules (`/api/ops-schedules`) — 7 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ✅ OPS | List schedules |
| GET | `/summary` | ✅ OPS | Today/missed/tomorrow summary |
| GET | `/students` | ✅ OPS | Assigned students |
| GET | `/:id` | ✅ OPS | Schedule detail |
| POST | `/` | ✅ OPS | Create schedule |
| PUT | `/:id` | ✅ OPS | Update schedule |
| DELETE | `/:id` | ✅ OPS | Delete schedule |

---

## 7. Middleware Layer

### 7.1 `authenticate` (auth.ts)
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies JWT signature and expiration
- Loads user from DB
- Checks `isVerified` (403 if false)
- Checks `isActive` (403 if false)
- Attaches `req.user = { userId, email, role }` to request

### 7.2 `authorize` (authorize.ts)
- Factory function: `authorize(...allowedRoles)`
- Checks `req.user.role` against allowed roles
- Returns 403 if role not permitted
- **Convenience exports:** `adminOnly`, `opsOnly`, `studentOnly`, `adminOrOps`, `nonStudentOnly`

### 7.3 Upload (upload.ts)
- **`upload`**: General file upload — PDF/JPG/JPEG/PNG, max 10MB, disk storage to `uploads/`
- **`uploadAdminLogo`**: Admin logo upload — JPG/PNG/GIF/WEBP, max 5MB, disk storage to `uploads/admin/`
- **`handleMulterError`**: Express error handler for Multer errors
- Files saved as `temp_<timestamp>_<originalname>`, moved to student directories by controllers

### 7.4 Validation (validate.ts)
- **`validateSignup`**: Validates firstName (≥2 chars), lastName, email (regex), role (must be STUDENT/ALUMNI/SERVICE_PROVIDER). Blocks PARENT and OPS from self-signup.
- **`validateRequest(fields[])`**: Factory → checks that all listed fields exist in `req.body`

---

## 8. Utility Functions

### 8.1 JWT (`utils/jwt.ts`)
- `generateToken(user)` → JWT with `{id, email, role}`, 7-day expiry
- `verifyToken(token)` → decoded payload or throws

### 8.2 OTP (`utils/otp.ts`)
- `generateOTP()` → random 4-digit string
- `hashOTP(otp)` → Base64 encode
- `compareOTP(otp, hashed)` → Base64 comparison
- `isOTPExpired(expiresAt)` → boolean check
- `getOTPExpiration(minutes=10)` → Date

### 8.3 Email (`utils/email.ts`)
Uses **Nodemailer with Gmail SMTP**. Falls back to console logging when credentials are missing.

| Function | Purpose |
|---|---|
| `sendEmail({to, subject, html})` | Core send function |
| `sendOTPEmail(email, name, otp, purpose)` | OTP for signup/login |
| `sendDocumentRejectionEmail(...)` | Document rejection notification |
| `sendStudentAccountCreatedEmail(...)` | Welcome email after lead conversion |
| `sendServiceRegistrationEmailToSuperAdmin(...)` | Alert on new service registration |
| `sendMeetingScheduledEmail(...)` | Meeting notification with optional Zoho link |

### 8.4 Zoho Meeting (`utils/zohoMeeting.ts`)
OAuth2 refresh-token flow with in-memory token caching.
- `createZohoMeeting({topic, startTime, duration, participantEmails})` → `{meetingKey, meetingUrl, startUrl}`
- `deleteZohoMeeting(meetingKey)` → deletes meeting (non-fatal on failure)

**Required env vars:** `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_DOMAIN`

---

## 9. Frontend Architecture

### 9.1 Project Structure
```
frontend/src/
├── app/           ← 40+ pages (Next.js App Router)
├── components/    ← 35 reusable components
├── config/        ← Static config (document types)
├── lib/           ← API clients (axios), world cities data
├── types/         ← TypeScript types & enums (591 lines)
└── utils/         ← Name helpers
```

### 9.2 API Client Layer (`lib/api.ts`)
- Centralized Axios instance with `NEXT_PUBLIC_API_URL` base
- Auto-attaches JWT from `localStorage` via request interceptor
- 10-second timeout
- Network error handling
- **12 API modules:** authAPI, superAdminAPI, adminAPI, adminStudentAPI, leadAPI, followUpAPI, teamMeetAPI, serviceAPI, formAnswerAPI, programAPI, chatAPI, opsScheduleAPI, leadConversionAPI
- **Separate files:** `coreDocumentAPI.ts`, `documentAPI.ts`

### 9.3 State Management
- **No global store** — all state via React `useState`/`useEffect` hooks
- Token stored in `localStorage` (`token`, `user`)
- Every protected page calls `authAPI.getProfile()` on mount for auth guard

### 9.4 Styling
- Tailwind CSS v4 with CSS variables for theming
- Custom animations in `globals.css`
- `framer-motion` for landing page animations
- `lucide-react` for icons

### 9.5 Key Libraries
- **react-big-calendar** — Calendar views for follow-ups, team meets, OPS schedules
- **date-fns** — Date formatting/manipulation
- **react-hot-toast** — Toast notifications globally
- **framer-motion** — Animation library

---

## 10. Frontend Pages (40+ Routes)

### Public Pages
| Route | Purpose |
|---|---|
| `/` | Landing page — hero, features, service carousel, stakeholder sections |
| `/login` | 2-step OTP login (email+captcha → OTP verification) |
| `/signup` | 2-step signup (name/email/role+captcha → OTP) |
| `/enquiry/[adminSlug]` | Public lead capture form per admin's unique slug |

### Student Pages
| Route | Purpose |
|---|---|
| `/dashboard` | Role-based redirect hub; students see registered + available services |
| `/profile` | Read-only profile display |
| `/student/registration/[registrationId]` | **Multi-step form filling** — Profile → Application → Documents → Payment |

### Admin Pages
| Route | Purpose |
|---|---|
| `/admin/dashboard` | Stats, enquiry form URL, TeamMeet calendar |
| `/admin/counselors` | CRUD counselors, toggle status |
| `/admin/counselors/[counselorId]` | Counselor detail + leads + follow-ups |
| `/admin/leads` | Lead management — filter, assign, approve conversions |
| `/admin/leads/[leadId]` | Lead detail |
| `/admin/students` | Student list under admin |
| `/admin/students/[studentId]` | Student detail |
| `/admin/students/[studentId]/registration/[registrationId]` | View student's form (read-only) |

### Counselor Pages
| Route | Purpose |
|---|---|
| `/counselor/dashboard` | Lead stats, follow-up calendar, team meets |
| `/counselor/leads/[leadId]` | Lead detail |
| `/counselor/students` | Student list |
| `/counselor/students/[studentId]` | Student detail |
| `/counselor/students/[studentId]/registration/[registrationId]` | View student's form |

### OPS Pages
| Route | Purpose |
|---|---|
| `/ops/dashboard` | Schedule calendar + task management |
| `/ops/services` | View all services |
| `/ops/students` | Assigned student list |
| `/ops/students/[studentId]` | Student detail |
| `/ops/students/[studentId]/registration/[registrationId]` | Student form + documents + programs |

### Super Admin Pages
| Route | Purpose |
|---|---|
| `/super-admin/dashboard` | Global stats by role |
| `/super-admin/users` | Full user management (approve/reject/toggle/delete) |
| `/super-admin/services` | View all services |
| `/super-admin/leads` | All leads across all admins |
| `/super-admin/leads/[leadId]` | Lead detail |
| `/super-admin/students` | All students |
| `/super-admin/roles/admin` | Admin users + create new |
| `/super-admin/roles/admin/[adminId]` | Admin detail dashboard |
| `/super-admin/roles/admin/[adminId]/counselors` | Admin's counselors |
| `/super-admin/roles/admin/[adminId]/leads` | Admin's leads |
| `/super-admin/roles/admin/[adminId]/students` | Admin's students |
| `/super-admin/roles/ops` | OPS user list |
| `/super-admin/roles/counselor` | Counselor list |
| `/super-admin/roles/counselor/[counselorId]` | Counselor detail |
| `/super-admin/roles/student` | Student list |
| `/super-admin/roles/student/[studentId]` | Student detail |
| `/super-admin/roles/parent` | Parent list |
| `/super-admin/roles/alumni` | Alumni list |
| `/super-admin/roles/eduplan-coach` | Eduplan Coach list |
| `/super-admin/roles/ivy-expert` | Ivy Expert list |
| `/super-admin/roles/service-provider` | Service Provider list |

---

## 11. Frontend Components (35 Components)

### Layout Components
| Component | Purpose |
|---|---|
| `Navbar` | Global navigation, role-aware dashboard links, auth state |
| `Footer` | Site footer |
| `AdminLayout` | Sidebar: Counselors/Leads/Students + company logo |
| `CounselorLayout` | Sidebar: Leads/Students |
| `OpsLayout` | Sidebar: Dashboard/My Students |
| `SuperAdminLayout` | Sidebar: all role pages, users, services, leads, students |
| `StudentLayout` | Sidebar: form part/section navigation |

### Dynamic Form System (7 Components)
| Component | Purpose |
|---|---|
| `FormFieldRenderer` | Renders individual fields by type (13 types: text, email, select, date, file, country/state/city, etc.) |
| `FormSectionRenderer` | Renders a full form section with all sub-sections |
| `FormSubSectionRenderer` | Renders sub-sections (supports repeatable instances with add/remove) |
| `FormPartsNavigation` | Top tabs for switching between form parts (Profile, Application, etc.) |
| `FormSectionsNavigation` | Sidebar tabs for sections within a part |
| `FormSaveButtons` | Save/submit action buttons |
| `StudentFormHeader` | Header bar showing student info and form title |

### Scheduling Components (9 Components)
| Component | Purpose |
|---|---|
| `FollowUpCalendar` | Calendar view (react-big-calendar) for counselor follow-ups |
| `FollowUpFormPanel` | Create/edit follow-up side panel |
| `FollowUpSidebar` | Summary sidebar (today/missed/upcoming counts) |
| `TeamMeetCalendar` | Calendar for internal team meetings |
| `TeamMeetFormPanel` | Create/respond to team meeting panel |
| `TeamMeetSidebar` | Team meet summary sidebar |
| `OpsScheduleCalendar` | Calendar for OPS task schedules |
| `OpsScheduleFormPanel` | Create/edit OPS schedule form |
| `OpsScheduleSidebar` | OPS schedule summary |
| `ScheduleCalendar` | Combined calendar view (follow-ups + team meets) |
| `ScheduleOverview` | Schedule summary overview |

### Program & Chat Components (4 Components)
| Component | Purpose |
|---|---|
| `ProgramCard` | University program display card |
| `ProgramSection` | Program listing within registration page |
| `ProgramFormModal` | Create/edit program modal dialog |
| `ProgramChatView` | Chat interface per program (open/private) |

### Other Components
| Component | Purpose |
|---|---|
| `DocumentUploadSection` | File upload with status, approve/reject workflow |
| `LeadDetailPanel` | Slide-over panel for lead detail view |
| `ServiceCard` | Service display card (register/view actions) |
| `RoleUserListPage` | Reusable role-filtered user list for super-admin role pages |

---

## 12. Core Business Flows

### 12.1 Lead Capture → Student Conversion

```
1. Admin creates account → gets unique enquiry form slug
2. Enquiry form URL: /enquiry/{adminSlug}
3. Public visitor submits enquiry → Lead created under that Admin
4. Admin assigns Lead to a Counselor
5. Counselor schedules Follow-ups (calls/meetings via Zoho)
6. Lead moves through stages: NEW → HOT → WARM → COLD
7. Counselor requests Lead→Student conversion
8. Admin approves/rejects conversion
9. On approval:
   a. User account created (STUDENT role, auto-verified)
   b. Student profile created (linked to admin + counselor)
   c. PROFILE form pre-populated with lead data (name, phone)
   d. Welcome email sent to student
10. Lead stage changes to CONVERTED_TO_STUDENT
```

### 12.2 Student Service Registration & Form Filling

```
1. Student logs in → Dashboard shows available services
2. Student clicks "Register" → StudentServiceRegistration created (status: REGISTERED)
3. Student navigates to form → 4-level hierarchical form loaded from DB
4. Form Structure:
   PART (tabs)
   └── SECTION (sidebar navigation)
       └── SUBSECTION (may be repeatable)
           └── FIELD (13 input types)
5. Student fills fields → auto-save on every change
6. First save: status transitions REGISTERED → IN_PROGRESS
7. Answers stored per student per part (not per registration)
   → Reusable when registering for second service
8. When all required fields filled → status → COMPLETED
```

### 12.3 Document Management

```
1. CORE document fields defined globally (form structure) + per-student (COREDocumentField)
2. Documents categorized: PRIMARY, SECONDARY
3. Upload flow:
   a. Student/OPS/SuperAdmin uploads file → saved to uploads/{studentId}/
   b. If uploaded by OPS/SuperAdmin → auto-approved
   c. If uploaded by Student → status: PENDING
4. Approval flow:
   a. OPS/SuperAdmin reviews → APPROVED or REJECTED
   b. On rejection → email sent to student with reason
5. Versioning: single-file fields replace existing; multi-file always creates new
```

### 12.4 Staff Assignment

```
Service-based assignment pattern:
- Study Abroad → OPS (Operations staff)
- Ivy League → IVY_EXPERT
- Education Planning → EDUPLAN_COACH

Each registration supports:
- Primary staff member
- Secondary staff member
- Active staff member (who currently handles the student)

Super Admin assigns via: POST /api/super-admin/students/registrations/:id/assign-ops
Super Admin can switch active: POST /api/super-admin/students/registrations/:id/switch-active-ops
```

### 12.5 Program Management & Chat

```
1. OPS/SuperAdmin creates university programs (or bulk imports from Excel)
2. Programs can be general or student-specific
3. Student views available programs → selects with priority/intake/year
4. Each selected program gets a ProgramChat:
   - Open chat: all participants (Student, OPS, Admin, Counselor, SuperAdmin)
   - Private chat: everyone except Student
5. Messages tracked with sender role, read receipts
```

### 12.6 Scheduling System (3 Types)

**Follow-Ups** (Counselor ↔ Lead):
- Counselor schedules calls with leads
- Time conflict detection (cross-checks FollowUps + TeamMeets)
- 21 granular outcome statuses
- Zoho Meeting integration for online calls
- Chain follow-ups (complete one → schedule next)

**Team Meets** (Admin ↔ Counselor):
- Internal team meeting requests
- Lifecycle: PENDING → CONFIRMED → COMPLETED (or REJECTED/CANCELLED)
- Bidirectional conflict checking
- Organization-scoped participants

**OPS Schedules** (OPS tasks):
- Student-specific or self ("Me") tasks
- Status: SCHEDULED → COMPLETED/MISSED
- Cron-ready missed schedule detection

---

## 13. Third-Party Integrations

### 13.1 Gmail SMTP (Nodemailer)
- Used for all transactional emails (OTP, welcome, rejection, notifications)
- Configured via `EMAIL_ADDRESS` and `EMAIL_PASSWORD` env vars
- Gmail App Password recommended
- Falls back to console logging when credentials missing

### 13.2 Zoho Meeting (OAuth2)
- Creates video call links for online meetings
- Used in Follow-Ups and Team Meets
- OAuth2 refresh-token flow with in-memory token caching
- Configured via `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_DOMAIN`
- Non-fatal on failure (meetings created without video link)

---

## 14. Environment Configuration

### Backend `.env`
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
PASSWORD_RESET_URL=http://localhost:3000/reset-password
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...
ZOHO_ACCOUNT_DOMAIN=...
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 15. Deployment

### Development
```bash
# Backend
cd backend && npm install && npm run dev  # Port 5000

# Frontend
cd frontend && npm install && npm run dev  # Port 3000
```

### Database Seeding
```bash
cd backend
npm run seed:forms       # Seed services and form structure
npm run seed:documents   # Seed document definitions
npm run create:indexes   # Create DB indexes
```

### Production Build
```bash
# Backend
cd backend && npm run build && npm start  # Compiles TS → dist/

# Frontend
cd frontend && npm run build && npm start  # Next.js production build
```

### Deployment Targets
- **Backend**: Vercel (vercel.json present), Hostinger VPS, any Node.js host
- **Frontend**: Vercel (Next.js native), any Node.js host
- **Database**: MongoDB Atlas
- **File Storage**: Local disk (uploads/ directory) or cloud storage

---

## Summary Statistics

| Metric | Count |
|---|---|
| User Roles | 10 |
| Database Models | 25 |
| API Endpoints | 132 |
| Backend Controllers | 18 |
| Middleware | 4 |
| Utility Modules | 4 |
| Frontend Pages | 40+ |
| Frontend Components | 35 |
| Email Templates | 6 |
| Form Field Types | 13 |
| Lead Stages | 6 |
| Follow-Up Statuses | 21 |

---

*This document serves as the complete reference for the Kareer Studio (CORE) platform. It covers every model, endpoint, page, component, and business flow in the system. Use this as the baseline for any future merges, migrations, or enhancements.*
