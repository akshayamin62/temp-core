# 🔄 Complete System Workflow Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Authentication Flow](#authentication-flow)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Student Journey](#student-journey)
6. [Admin Workflow](#admin-workflow)
7. [OPS Workflow](#OPS-workflow)
8. [Service & Form System](#service--form-system)
9. [API Routes](#api-routes)
10. [Frontend Pages](#frontend-pages)

---

## 🎯 System Overview

**Kareer Studio** is a comprehensive educational services management platform with:
- Multi-role user system (Students, Ops, Alumni, Admin, Service Providers)
- Dynamic form generation system
- Service-based registration and tracking
- OTP-based authentication without passwords
- Real-time form saving with progress tracking

### Core Technologies
- **Backend**: Node.js, Express, TypeScript, MongoDB/Mongoose
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Authentication**: JWT with OTP-based login (no passwords)

---

## 🗄️ Database Architecture

### Core Collections

#### 1. **Users Collection**
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  role: enum [STUDENT, OPS, ALUMNI, ADMIN, SERVICE_PROVIDER, PARENT],
  isVerified: boolean,    // Email verified + Admin approved
  isActive: boolean,      // Account active status
  otp: string (hashed),   // Temporary OTP for login
  otpExpires: Date,       // OTP expiration time
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Central authentication and authorization
**Key Features**: 
- No password field (OTP-based auth)
- Role-based access control
- Two-level verification (email + admin approval for non-students)

#### 2. **Students Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  email: string,
  mobileNumber: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Student-specific profile data
**Relations**: One-to-one with Users (auto-created on student signup verification)

#### 3. **Ops Collection**
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  email: string,
  mobileNumber: string,
  specializations: string[],
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: OPS profile and specialization data
**Relations**: One-to-one with Users (admin-created)

#### 4. **Services Collection**
```typescript
{
  _id: ObjectId,
  name: string (unique),
  slug: string (unique),
  description: string,
  shortDescription: string,
  icon: string,
  isActive: boolean,
  order: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Available services (Study Abroad, IELTS, GRE, etc.)
**Examples**: Study Abroad, IELTS Preparation, GRE Preparation, Ivy League Admissions

#### 5. **FormPart Collection**
```typescript
{
  _id: ObjectId,
  key: string (unique),        // PROFILE, APPLICATION, DOCUMENT, PAYMENT
  title: string,
  description: string,
  order: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Reusable form parts that can be attached to services
**Design**: Allows form part reuse across multiple services

#### 6. **ServiceFormPart Collection**
```typescript
{
  _id: ObjectId,
  serviceId: ObjectId (ref: Service),
  formPartId: ObjectId (ref: FormPart),
  order: number,
  isRequired: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Maps which form parts belong to which services
**Relations**: Many-to-many bridge between Services and FormParts

#### 7. **FormSection Collection**
```typescript
{
  _id: ObjectId,
  formPartId: ObjectId (ref: FormPart),
  title: string,
  description: string,
  order: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Major sections within a form part
**Example**: Personal Information, Academic Qualification, Test Scores

#### 8. **FormSubSection Collection**
```typescript
{
  _id: ObjectId,
  formSectionId: ObjectId (ref: FormSection),
  title: string,
  description: string,
  order: number,
  isRepeatable: boolean,       // Can have multiple instances
  minInstances: number,
  maxInstances: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Subsections within sections (repeatable for multiple entries)
**Examples**: Education History (repeatable), Work Experience (repeatable)

#### 9. **FormField Collection**
```typescript
{
  _id: ObjectId,
  formSubSectionId: ObjectId (ref: FormSubSection),
  key: string,                 // Field identifier
  label: string,
  type: enum [TEXT, TEXTAREA, EMAIL, SELECT, etc.],
  placeholder: string,
  defaultValue: any,
  validations: {
    required: boolean,
    minLength: number,
    maxLength: number,
    pattern: string,
    customMessage: string
  },
  options: Array,              // For SELECT, RADIO, CHECKBOX
  order: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Individual form fields with validation rules
**Supported Types**: 13 field types (TEXT, EMAIL, SELECT, MULTI_SELECT, DATE, FILE, etc.)

#### 10. **StudentServiceRegistration Collection**
```typescript
{
  _id: ObjectId,
  studentId: ObjectId (ref: Student),
  serviceId: ObjectId (ref: Service),
  assignedOpsId: ObjectId (ref: OPS),
  status: enum [REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED],
  registeredAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  paymentStatus: string,
  paymentAmount: number,
  notes: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Track student enrollments in services
**Unique Constraint**: Student can only register once per service

#### 11. **StudentFormAnswer Collection**
```typescript
{
  _id: ObjectId,
  studentId: ObjectId (ref: Student),
  partKey: string,             // PROFILE, APPLICATION, etc.
  answers: Object,             // Nested structure of all answers
  lastSavedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Store student form responses (part-wise for reusability)
**Key Design**: 
- One document per student per part key
- Answers reusable across services
- Auto-saves as student fills forms

#### 12. **Program Collection**
```typescript
{
  _id: ObjectId,
  serviceRegistrationId: ObjectId (ref: StudentServiceRegistration),
  universityName: string,
  programName: string,
  country: string,
  applicationDeadline: Date,
  status: enum [PENDING, APPLIED, ACCEPTED, REJECTED, etc.],
  notes: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Track program applications within a service registration

---

## 🔐 Authentication Flow

### Signup Process (No Passwords!)

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT SIGNUP FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. User visits /signup
   ├─> Enters: name, email, role
   ├─> Solves captcha (hashed client-side)
   └─> Submits form

2. Frontend: POST /api/auth/signup
   ├─> Validates captcha hash
   ├─> Checks if email exists
   ├─> Generates 4-digit OTP
   ├─> Creates User (isVerified: false)
   ├─> Sends OTP to email
   └─> Returns success message

3. User receives OTP email
   └─> Enters OTP on frontend

4. Frontend: POST /api/auth/verify-signup-otp
   ├─> Validates OTP
   ├─> For STUDENT:
   │   ├─> Sets isVerified: true, isActive: true
   │   ├─> Creates Student profile entry
   │   ├─> Returns JWT token
   │   └─> Redirects to /dashboard
   └─> For OTHER ROLES:
       ├─> Sets isVerified: false (needs admin approval)
       ├─> Returns success (no token)
       └─> Redirects to /login

┌─────────────────────────────────────────────────────────────┐
│                    NON-STUDENT SIGNUP FLOW                   │
└─────────────────────────────────────────────────────────────┘

Same as above, BUT:
- After OTP verification, isVerified stays FALSE
- User cannot login until admin approves
- Admin reviews in /admin/users
- Admin approves → isVerified: true → User can now login
```

### Login Process (OTP-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. User visits /login
   ├─> Enters email
   ├─> Solves captcha
   └─> Clicks "Request OTP"

2. Frontend: POST /api/auth/login
   ├─> Validates captcha
   ├─> Checks if user exists
   ├─> Checks if isVerified: true (email + admin approval)
   ├─> Checks if isActive: true
   ├─> Generates new 4-digit OTP (10 min expiry)
   ├─> Sends OTP to email
   └─> Returns success

3. User receives OTP email
   └─> Enters OTP on frontend

4. Frontend: POST /api/auth/verify-otp
   ├─> Validates OTP
   ├─> Clears OTP from database
   ├─> Generates JWT token
   ├─> Returns token + user data
   └─> Stores in localStorage

5. Frontend redirects based on role:
   ├─> ADMIN → /admin/dashboard
   ├─> OPS → /OPS/dashboard
   └─> STUDENT → /dashboard
```

### Authentication Middleware

```typescript
// Applied to all protected routes
authenticate(req, res, next) {
  1. Extract JWT from Authorization header
  2. Verify JWT signature
  3. Check if user still exists
  4. Check if user.isVerified === true
  5. Check if user.isActive === true
  6. Attach user data to req.user
  7. Call next()
}
```

---

## 👥 User Roles & Permissions

### Role Hierarchy

| Role | Auto-Verify | Needs Admin Approval | Dashboard |
|------|-------------|---------------------|-----------|
| **STUDENT** | ✅ Yes | ❌ No | /dashboard |
| **OPS** | ❌ No | ✅ Yes | /OPS/dashboard |
| **ALUMNI** | ❌ No | ✅ Yes | /dashboard |
| **ADMIN** | ✅ Manual | ✅ Manual | /admin/dashboard |
| **SERVICE_PROVIDER** | ❌ No | ✅ Yes | /dashboard |
| **PARENT** | 🚫 Cannot signup | N/A | N/A |

### Permission Matrix

| Feature | Student | OPS | Admin |
|---------|---------|-----------|-------|
| Register for services | ✅ | ❌ | ✅ View |
| Fill service forms | ✅ | ❌ | ✅ View |
| View own registrations | ✅ | ❌ | ✅ All |
| View all students | ❌ | ✅ Assigned | ✅ All |
| Approve users | ❌ | ❌ | ✅ |
| Manage services | ❌ | ❌ | ✅ |
| Create ops | ❌ | ❌ | ✅ |

---

## 🎓 Student Journey

### Complete Student Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

PHASE 1: Registration & Verification (5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/signup
├─> Fill: Name, Email, Role=STUDENT, Captcha
├─> Submit → OTP sent to email
└─> Enter OTP → Account auto-verified ✅
    └─> JWT token generated
    └─> Redirect to /dashboard

PHASE 2: Service Discovery (Browse available services)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/dashboard
├─> View all available services
│   ├─> Study Abroad
│   ├─> IELTS Preparation
│   ├─> GRE Preparation
│   ├─> Ivy League Admissions
│   └─> Education Planning
└─> Click "Register" on desired service

PHASE 3: Service Registration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API: POST /api/services/register
├─> Creates StudentServiceRegistration
│   └─> status: REGISTERED
└─> Service card appears in "My Services"

PHASE 4: Form Filling (Multi-part dynamic forms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/my-details?registrationId=xxx
├─> Loads form structure for service
│   └─> GET /api/services/services/:serviceId/form
│
├─> Form Structure (4-level hierarchy):
│   └─> PART (Profile, Application, Documents)
│       └─> SECTION (Personal Info, Education)
│           └─> SUBSECTION (Current Education, Past Education)
│               └─> FIELDS (Name, Email, Phone, etc.)
│
├─> Example: Study Abroad Service
│   ├─> Part 1: PROFILE
│   │   ├─> Section: Personal Information
│   │   │   └─> SubSection: Basic Details
│   │   │       └─> Fields: Name, Email, Phone, DOB, etc.
│   │   ├─> Section: Academic Qualification
│   │   │   └─> SubSection: Education History (Repeatable)
│   │   │       └─> Fields: School, Degree, GPA, Year, etc.
│   │   └─> Section: Work Experience
│   │       └─> SubSection: Job History (Repeatable)
│   │           └─> Fields: Company, Role, Duration, etc.
│   │
│   ├─> Part 2: APPLICATION
│   │   └─> Section: Program Selection
│   │       └─> SubSection: University & Program (Repeatable)
│   │           └─> Fields: University, Program, Country, etc.
│   │
│   └─> Part 3: DOCUMENTS
│       └─> Section: Required Documents
│           └─> SubSection: Document Upload
│               └─> Fields: Passport, Transcripts, etc.
│
├─> Auto-save functionality:
│   ├─> Every field change triggers save
│   ├─> POST /api/forms/save
│   └─> Updates StudentFormAnswer collection
│
└─> Status changes:
    ├─> First save: REGISTERED → IN_PROGRESS
    └─> All complete: IN_PROGRESS → COMPLETED

PHASE 5: Progress Tracking
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/dashboard → My Services
├─> Each service card shows:
│   ├─> Service name & description
│   ├─> Registration status badge
│   ├─> Progress percentage
│   └─> "Continue" or "View Details" button
│
└─> Visual indicators:
    ├─> 🔵 REGISTERED (blue)
    ├─> 🟡 IN_PROGRESS (yellow)
    ├─> 🟢 COMPLETED (green)
    └─> 🔴 CANCELLED (red)

PHASE 6: Form Data Reusability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When registering for SECOND service:
├─> StudentFormAnswer already exists for PROFILE part
├─> Form auto-fills with previous data
├─> Student only needs to fill service-specific parts
└─> Reduces duplicate data entry ✅

Example Scenario:
1. Student fills Study Abroad (PROFILE, APPLICATION, DOCUMENTS)
2. Student registers for GRE Preparation
3. PROFILE data auto-filled (name, education, etc.)
4. Student only fills GRE-specific sections
```

### Student Dashboard Features

**My Services Section** (`/dashboard`)
- Grid of service cards
- Each card shows:
  - Service icon and name
  - Short description
  - Registration status
  - Action button (Register / Continue / View)

**Form Filling Page** (`/my-details`)
- Multi-tab navigation (Parts)
- Sidebar section navigation
- Form fields with validation
- Auto-save indicator
- Progress bar
- Save & Continue / Save & Exit buttons

---

## 👨‍💼 Admin Workflow

### Admin Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                           │
└─────────────────────────────────────────────────────────────┘

/admin/dashboard
├─> Statistics Overview
│   ├─> Total Students
│   ├─> Active Services
│   ├─> Total Registrations
│   └─> Pending Reviews
│
└─> Quick Actions
    ├─> View All Students
    ├─> View Services
    └─> User Management

┌─────────────────────────────────────────────────────────────┐
│                    USER MANAGEMENT                           │
└─────────────────────────────────────────────────────────────┘

/admin/users
├─> View all users with filters
│   ├─> Filter by role
│   ├─> Filter by verification status
│   ├─> Search by name/email
│   └─> Sort by date
│
├─> Pending Approvals Tab
│   ├─> GET /api/admin/pending
│   ├─> Shows unverified OPS, ALUMNI, SERVICE_PROVIDER
│   └─> Actions:
│       ├─> Approve → POST /api/admin/users/:id/approve
│       │   └─> Sets isVerified: true
│       │   └─> Sends approval email
│       └─> Reject → POST /api/admin/users/:id/reject
│           └─> Deletes user
│           └─> Sends rejection email
│
└─> User Actions
    ├─> Toggle Active/Inactive
    │   └─> PATCH /api/admin/users/:id/toggle-status
    └─> Delete User
        └─> DELETE /api/admin/users/:id

┌─────────────────────────────────────────────────────────────┐
│                  STUDENT MANAGEMENT                          │
└─────────────────────────────────────────────────────────────┘

/admin/students
├─> View all students
│   ├─> GET /api/admin/students
│   ├─> Shows: Name, Email, Registrations, Status
│   └─> Search & Filter
│
├─> Click student → /admin/students/:id
│   ├─> Student profile details
│   ├─> Service registrations
│   ├─> Form submission progress
│   └─> Assigned OPS
│
└─> Actions:
    ├─> View student forms (read-only)
    ├─> Assign OPS
    └─> Update registration status

┌─────────────────────────────────────────────────────────────┐
│                OPS MANAGEMENT                          │
└─────────────────────────────────────────────────────────────┘

/admin/ops/add
├─> Create new OPS
│   ├─> POST /api/admin/ops
│   ├─> Input: Name, Email, Phone, Specializations
│   └─> Creates User + OPS profile
│       └─> User.isVerified: true (admin-created)
│
└─> OPS gets email with login instructions
```

---

## 👨‍🏫 OPS Workflow

### OPS Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                  OPS DASHBOARD                         │
└─────────────────────────────────────────────────────────────┘

/OPS/dashboard
├─> My Assigned Students
│   ├─> List of students assigned to OPS
│   ├─> Quick stats per student
│   └─> Click → View student details
│
├─> Student Management
│   └─> /OPS/students
│       ├─> View all assigned students
│       ├─> Filter by service
│       ├─> Filter by status
│       └─> Click student → /OPS/students/:id
│
└─> View student forms (read-only)
    ├─> See all student form submissions
    ├─> Review progress
    └─> Add notes/comments
```

---

## 📝 Service & Form System

### Dynamic Form Generation

The system uses a **4-level hierarchical form structure**:

```
SERVICE
└─> FORM PARTS (linked via ServiceFormPart)
    └─> SECTIONS
        └─> SUBSECTIONS (can be repeatable)
            └─> FIELDS (13 types supported)
```

### Form Part Types

| Part Key | Purpose | Example Sections |
|----------|---------|------------------|
| PROFILE | Personal & academic info | Personal Info, Education, Work Experience |
| APPLICATION | Service-specific applications | University Selection, Program Details |
| DOCUMENT | Document uploads | Passport, Transcripts, Certificates |
| PAYMENT | Payment information | Payment Method, Billing Address |

### Field Types Supported

1. **TEXT** - Single-line text input
2. **TEXTAREA** - Multi-line text input
3. **EMAIL** - Email with validation
4. **NUMBER** - Numeric input
5. **DATE** - Date picker
6. **SELECT** - Single dropdown
7. **MULTI_SELECT** - Multiple selection dropdown
8. **RADIO** - Radio buttons
9. **CHECKBOX** - Single checkbox
10. **CHECKBOX_GROUP** - Multiple checkboxes
11. **FILE** - File upload
12. **PHONE** - Phone number with validation
13. **URL** - URL with validation

### Repeatable Subsections

Certain subsections can have multiple instances:
- **Education History** - Add multiple schools/degrees
- **Work Experience** - Add multiple jobs
- **Program Applications** - Apply to multiple universities

```typescript
{
  isRepeatable: true,
  minInstances: 1,
  maxInstances: 10
}
```

### Form Saving Logic

```javascript
// Auto-save on every field change
const handleFieldChange = (partKey, sectionId, subSectionId, index, key, value) => {
  // Update local state
  setFormValues(...)
  
  // Debounced API call
  POST /api/forms/save {
    registrationId,
    partKey,
    answers: {
      [sectionId]: {
        [subSectionId]: [
          { [key]: value }
        ]
      }
    }
  }
  
  // Backend merges with existing answers
  // Updates StudentFormAnswer document
}
```

---

## 🛣️ API Routes

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/signup` | ❌ | Create account & send OTP |
| POST | `/verify-signup-otp` | ❌ | Verify OTP after signup |
| POST | `/login` | ❌ | Request OTP for login |
| POST | `/verify-otp` | ❌ | Verify OTP & login |
| GET | `/profile` | ✅ | Get current user profile |

### Admin Routes (`/api/admin`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/users` | ✅ Admin | Get all users with filters |
| GET | `/stats` | ✅ Admin | Get user statistics |
| GET | `/pending` | ✅ Admin | Get pending approvals |
| POST | `/users/:id/approve` | ✅ Admin | Approve user |
| POST | `/users/:id/reject` | ✅ Admin | Reject user |
| PATCH | `/users/:id/toggle-status` | ✅ Admin | Toggle active status |
| DELETE | `/users/:id` | ✅ Admin | Delete user |
| POST | `/ops` | ✅ Admin | Create OPS |

### Admin Student Routes (`/api/admin/students`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | ✅ Admin | Get all students |
| GET | `/:id` | ✅ Admin | Get student details |
| GET | `/:id/registrations` | ✅ Admin | Get student registrations |

### Service Routes (`/api/services`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/services` | ❌ | Get all active services |
| GET | `/my-services` | ✅ | Get student's registrations |
| POST | `/register` | ✅ | Register for a service |
| GET | `/services/:id/form` | ❌ | Get service form structure |
| GET | `/registrations/:id` | ✅ | Get registration details |

### Form Answer Routes (`/api/forms`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/save` | ✅ | Save form answers |
| GET | `/registrations/:id/answers` | ✅ | Get saved answers |

### Student Routes (`/api/student`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/profile` | ✅ Student | Get student profile |
| PUT | `/profile` | ✅ Student | Update student profile |
| DELETE | `/profile` | ✅ Student | Delete student profile |

### Program Routes (`/api/programs`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/` | ✅ | Add program application |
| GET | `/registration/:id` | ✅ | Get programs for registration |
| PUT | `/:id` | ✅ | Update program |
| DELETE | `/:id` | ✅ | Delete program |

---

## 🖥️ Frontend Pages

### Public Pages (No Auth Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Login with OTP |
| `/signup` | `app/signup/page.tsx` | Signup with OTP verification |

### Student Pages (Auth Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/dashboard` | `app/dashboard/page.tsx` | Student dashboard |
| `/my-details` | `app/my-details/page.tsx` | Fill service forms |
| `/profile` | `app/profile/page.tsx` | View/edit profile |

### Admin Pages (Admin Only)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Admin overview |
| `/admin/users` | `app/admin/users/page.tsx` | User management |
| `/admin/students` | `app/admin/students/page.tsx` | Student list |
| `/admin/students/:id` | `app/admin/students/[studentId]/page.tsx` | Student details |
| `/admin/ops/add` | `app/admin/ops/add/page.tsx` | Create OPS |
| `/admin/services` | `app/admin/services/page.tsx` | Service management |

### OPS Pages (OPS Only)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/OPS/dashboard` | `app/OPS/dashboard/page.tsx` | OPS overview |
| `/OPS/students` | `app/OPS/students/page.tsx` | Assigned students |
| `/OPS/students/:id` | `app/OPS/students/[studentId]/page.tsx` | Student details |

---

## 🔄 Complete Data Flow Example

### Scenario: Student Registers for "Study Abroad" Service

```
┌─────────────────────────────────────────────────────────────┐
│          STEP-BY-STEP: STUDY ABROAD REGISTRATION            │
└─────────────────────────────────────────────────────────────┘

1️⃣ STUDENT SIGNUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: /signup
├─> User enters: John Doe, john@email.com, STUDENT
├─> Solves captcha
├─> POST /api/auth/signup
Backend:
├─> Generates OTP: 4826
├─> Creates User:
│   {
│     name: "John Doe",
│     email: "john@email.com",
│     role: "STUDENT",
│     isVerified: false,
│     otp: "hashed_4826",
│     otpExpires: Date(+10 mins)
│   }
├─> Sends email with OTP
└─> Returns: { message: "OTP sent to your email" }

2️⃣ OTP VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: User enters OTP 4826
├─> POST /api/auth/verify-signup-otp { email, otp: "4826" }
Backend:
├─> Validates OTP
├─> Updates User:
│   {
│     isVerified: true,
│     isActive: true,
│     otp: null,
│     otpExpires: null
│   }
├─> Creates Student:
│   {
│     userId: user._id,
│     email: "john@email.com",
│     mobileNumber: ""
│   }
├─> Generates JWT token
└─> Returns: { token, user }
Frontend:
├─> Stores token in localStorage
└─> Redirects to /dashboard

3️⃣ VIEW SERVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: /dashboard
├─> GET /api/services/services
Backend:
└─> Returns all active services:
    [
      {
        _id: "service123",
        name: "Study Abroad",
        slug: "study-abroad",
        description: "...",
        isActive: true
      },
      { ... IELTS },
      { ... GRE }
    ]

4️⃣ REGISTER FOR SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: User clicks "Register" on Study Abroad card
├─> POST /api/services/register { serviceId: "service123" }
Backend:
├─> Gets studentId from userId
├─> Creates StudentServiceRegistration:
│   {
│     studentId: "student456",
│     serviceId: "service123",
│     status: "REGISTERED",
│     registeredAt: Date.now()
│   }
└─> Returns: { registration }
Frontend:
└─> Updates UI: Service card now shows "View Details" button

5️⃣ LOAD FORM STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: /my-details?registrationId=reg789
├─> GET /api/services/registrations/reg789
Backend:
└─> Returns registration details with populated service

Frontend: GET /api/services/services/service123/form
Backend:
├─> Finds all ServiceFormParts for this service
├─> Populates FormPart, Sections, SubSections, Fields
└─> Returns hierarchical structure:
    [
      {
        part: { key: "PROFILE", title: "Profile Information" },
        sections: [
          {
            _id: "sec1",
            title: "Personal Information",
            subSections: [
              {
                _id: "subsec1",
                title: "Basic Details",
                isRepeatable: false,
                fields: [
                  { key: "firstName", label: "First Name", type: "TEXT" },
                  { key: "lastName", label: "Last Name", type: "TEXT" },
                  { key: "email", label: "Email", type: "EMAIL" },
                  { key: "phone", label: "Phone", type: "PHONE" },
                  ...
                ]
              }
            ]
          },
          {
            _id: "sec2",
            title: "Academic Qualification",
            subSections: [
              {
                _id: "subsec2",
                title: "Education History",
                isRepeatable: true,
                minInstances: 1,
                maxInstances: 5,
                fields: [
                  { key: "schoolName", type: "TEXT" },
                  { key: "degree", type: "SELECT" },
                  { key: "gpa", type: "NUMBER" },
                  ...
                ]
              }
            ]
          }
        ]
      },
      {
        part: { key: "APPLICATION", title: "Application Details" },
        sections: [ ... ]
      }
    ]

6️⃣ LOAD EXISTING ANSWERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: GET /api/forms/registrations/reg789/answers
Backend:
├─> Finds StudentFormAnswer docs for this student
└─> Returns:
    {
      answers: [
        {
          partKey: "PROFILE",
          answers: {
            "sec1": {
              "subsec1": [
                {
                  firstName: "John",
                  lastName: "Doe",
                  email: "john@email.com",
                  phone: "+1234567890"
                }
              ]
            },
            "sec2": {
              "subsec2": [
                {
                  schoolName: "ABC University",
                  degree: "Bachelor",
                  gpa: 3.8
                },
                {
                  schoolName: "XYZ High School",
                  degree: "High School",
                  gpa: 3.9
                }
              ]
            }
          }
        }
      ],
      student: {
        mobileNumber: "+1234567890"
      }
    }

Frontend:
└─> Pre-fills form fields with existing data

7️⃣ FILL & SAVE FORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: User fills first name field
├─> onChange: handleFieldChange("PROFILE", "sec1", "subsec1", 0, "firstName", "John")
├─> Updates local state
├─> Debounced POST /api/forms/save
    {
      registrationId: "reg789",
      partKey: "PROFILE",
      answers: {
        "sec1": {
          "subsec1": [
            { firstName: "John" }
          ]
        }
      }
    }

Backend:
├─> Gets student from registration
├─> Finds StudentFormAnswer for this student + partKey
├─> Merges new answers with existing:
│   {
│     studentId: "student456",
│     partKey: "PROFILE",
│     answers: {
│       "sec1": {
│         "subsec1": [
│           { 
│             firstName: "John",
│             lastName: "Doe",    // kept from before
│             email: "...",       // kept from before
│             phone: "..."        // kept from before
│           }
│         ]
│       },
│       "sec2": { ... }  // kept from before
│     },
│     lastSavedAt: Date.now()
│   }
├─> Updates registration status: REGISTERED → IN_PROGRESS
└─> Returns: { success: true }

Frontend:
└─> Shows "Saved!" toast notification

8️⃣ ADD REPEATABLE INSTANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: User clicks "Add Education" button
├─> Adds new instance to local state:
    "subsec2": [
      { schoolName: "ABC University", ... },
      {}  // New empty instance
    ]
├─> Renders new empty form fields
└─> User fills new education entry
    └─> Auto-saves as usual

9️⃣ NAVIGATE BETWEEN PARTS/SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: User clicks "APPLICATION" tab
├─> selectedPartIndex = 1
├─> Loads APPLICATION part sections
├─> Pre-fills any existing APPLICATION answers
└─> Continues filling form

🔟 FORM COMPLETION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After all required fields filled:
├─> Registration status: IN_PROGRESS → COMPLETED
├─> Admin/OPS can now review submission
└─> Student can view/edit anytime from /my-details
```

---

## 🎨 Key Features & Design Decisions

### 1. **Passwordless Authentication**
- ✅ More secure (no password storage)
- ✅ Better UX (no password to remember)
- ✅ OTP-based with email delivery
- ✅ 10-minute OTP expiration

### 2. **Two-Level Verification**
- **Students**: Email verification only → Auto-approved
- **Others**: Email + Admin approval required
- Prevents unauthorized access to OPS/admin features

### 3. **Form Data Reusability**
- StudentFormAnswer linked to student, not registration
- PROFILE data reused across multiple services
- Reduces duplicate data entry
- Improves user experience

### 4. **Hierarchical Form Structure**
- 4 levels: Part → Section → SubSection → Field
- Flexible and extensible
- Supports repeatable sections
- 13 field types supported

### 5. **Auto-Save Functionality**
- Saves on every field change (debounced)
- No "Save" button needed
- Progress never lost
- Real-time sync with backend

### 6. **Role-Based Access Control**
- Middleware checks role on every request
- Different dashboards per role
- Protected routes with auth guards
- Clear permission boundaries

---

## 🚀 System Capabilities

### ✅ Currently Implemented

1. **Authentication System**
   - OTP-based signup/login
   - Role-based access control
   - JWT token management
   - Email verification

2. **User Management**
   - Multi-role support
   - Admin approval workflow
   - User activation/deactivation
   - OPS creation by admin

3. **Service System**
   - Service creation and management
   - Student registration for services
   - Status tracking (REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED)

4. **Dynamic Form System**
   - 4-level form hierarchy
   - 13 field types
   - Repeatable subsections
   - Form validation
   - Auto-save functionality

5. **Student Dashboard**
   - Service discovery
   - Registration management
   - Form filling interface
   - Progress tracking

6. **Admin Dashboard**
   - User approval system
   - Student management
   - OPS creation
   - System statistics

### 🔨 Future Enhancements

1. **Document Upload System**
   - File upload to cloud storage
   - Document verification
   - Version management

2. **OPS Assignment**
   - Auto-assign based on specialization
   - Workload balancing
   - Student-OPS chat

3. **Payment Integration**
   - Payment gateway integration
   - Invoice generation
   - Payment tracking

4. **Notification System**
   - Email notifications
   - In-app notifications
   - SMS alerts

5. **Analytics & Reporting**
   - Student progress reports
   - Service analytics
   - Conversion tracking

---

## 📊 Database Relationships Diagram

```
Users (Authentication)
  └─> 1:1 ─> Students (Student Profile)
              └─> 1:N ─> StudentServiceRegistrations
                          ├─> N:1 ─> Services
                          └─> 1:N ─> Programs
              └─> 1:N ─> StudentFormAnswers (Reusable across services)
                          └─> partKey links to FormPart

Services
  └─> N:M ─> ServiceFormParts ─> FormParts
                                  └─> 1:N ─> FormSections
                                              └─> 1:N ─> FormSubSections
                                                          └─> 1:N ─> FormFields

Users
  └─> 1:1 ─> Ops (OPS Profile)
              └─> 1:N ─> StudentServiceRegistrations (assigned)
```

---

## 🔐 Security Features

1. **JWT Authentication**
   - Token-based auth
   - Expires after 7 days
   - Refresh token support

2. **OTP Security**
   - 4-digit random OTP
   - Hashed before storage
   - 10-minute expiration
   - One-time use only

3. **CAPTCHA Protection**
   - Client-side hashed captcha
   - Prevents bot signups
   - Regenerates on error

4. **Role-Based Authorization**
   - Middleware checks on every request
   - Route-level protection
   - Database-level checks

5. **Input Validation**
   - Backend validation middleware
   - Frontend validation
   - Type safety with TypeScript

---

## 📝 Summary

**Kareer Studio** is a modern, secure, and scalable educational services platform with:

✅ **Passwordless OTP-based authentication**  
✅ **Multi-role user system with approval workflow**  
✅ **Dynamic form generation with 4-level hierarchy**  
✅ **Auto-save functionality for better UX**  
✅ **Form data reusability across services**  
✅ **Comprehensive admin & OPS dashboards**  
✅ **Student-centric service registration flow**  
✅ **RESTful API architecture**  
✅ **Type-safe TypeScript implementation**  

The system is designed for **scalability**, **maintainability**, and **excellent user experience**.

---

**Last Updated**: January 20, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅

