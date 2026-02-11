# Phase 2: Enrollment & Answer Flow - COMPLETE ✅

## Overview
Phase 2 implements the complete student journey from enrollment to form submission, including:
- Student enrollment in services
- Real-time answer saving with auto-fill
- Repeatable section management
- Form submission workflow
- Edit request approval system
- Counselor assignment

---

## 🎯 New APIs Implemented

### 1. Enrollment APIs (`/api/enrollments`)

#### Enroll in Service
```http
POST /api/enrollments
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "serviceId": "service_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully enrolled in service",
  "data": {
    "enrollment": {
      "_id": "enrollment_id",
      "student": { /* student details */ },
      "service": { "name": "Education Planning", "description": "..." },
      "status": "not_started",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get My Enrollments
```http
GET /api/enrollments
Authorization: Bearer <student-token>
```

#### Get Enrollment by ID
```http
GET /api/enrollments/:id
Authorization: Bearer <token>
```

#### Update Enrollment Status
```http
PATCH /api/enrollments/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress" | "submitted" | "completed"
}
```

#### Assign Counselor (Admin only)
```http
PATCH /api/enrollments/:id/assign-counselor
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "counselorId": "counselor_id_here"
}
```

#### Get All Enrollments (Admin/Counselor)
```http
GET /api/enrollments/all?status=in_progress&serviceId=xxx
Authorization: Bearer <admin/counselor-token>
```

#### Get My Students (Counselor)
```http
GET /api/enrollments/my-students
Authorization: Bearer <counselor-token>
```

---

### 2. Answer APIs (`/api/answers`)

#### Save/Update Answer
```http
POST /api/answers/save
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "enrollmentId": "enrollment_id",
  "sectionId": "section_id",
  "sectionInstanceId": "uuid-or-default", // Optional for non-repeatable
  "questionId": "question_id",
  "value": "answer value here"
}
```

**Features:**
- Auto-creates Answer document if doesn't exist
- Maintains complete update history
- Auto-updates enrollment status to "in_progress"
- Supports all question types (text, number, date, select, multiselect)

#### Get Service Answers (with Auto-fill)
```http
GET /api/answers/service/:serviceId
Authorization: Bearer <student-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceId": "service_id",
    "sections": [
      {
        "section": {
          "_id": "section_id",
          "title": "Personal Information",
          "description": "...",
          "isRepeatable": false,
          "questions": [ /* question configs */ ]
        },
        "instances": [
          {
            "sectionInstanceId": "default-section_id",
            "answers": {
              "question_id_1": {
                "value": "John Doe",
                "lastUpdated": "2024-01-01T00:00:00.000Z"
              },
              "question_id_2": {
                "value": "Bachelor's",
                "lastUpdated": "2024-01-01T00:00:00.000Z"
              }
            }
          }
        ]
      }
    ]
  }
}
```

**Auto-fill Logic:**
- Fetches all answers for the student across ALL services
- Returns answers organized by section and instance
- Frontend can pre-populate form fields
- Works seamlessly with repeatable sections

#### Add Section Instance (Repeatable Sections)
```http
POST /api/answers/add-section-instance
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "enrollmentId": "enrollment_id",
  "sectionId": "section_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Section instance added successfully",
  "data": {
    "sectionInstanceId": "uuid-generated",
    "sectionId": "section_id"
  }
}
```

**Validation:**
- Checks if section is repeatable
- Enforces `maxRepeats` limit
- Generates unique UUID for instance

#### Remove Section Instance
```http
DELETE /api/answers/remove-section-instance
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "sectionId": "section_id",
  "sectionInstanceId": "uuid-to-remove"
}
```

**Validation:**
- Enforces `minRepeats` requirement
- Only works for repeatable sections

#### Submit Form
```http
POST /api/answers/submit
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "enrollmentId": "enrollment_id"
}
```

**Actions:**
- Updates enrollment status to "submitted"
- Locks form from further edits (unless edit request approved)
- Triggers notification to assigned counselor (future)

#### Get Student Answers (Admin/Counselor View)
```http
GET /api/answers/student/:studentId
Authorization: Bearer <admin/counselor-token>
```

**Response:**
- Complete answer document with full history
- All sections and instances
- Update history with who/when/what

---

### 3. Edit Request APIs (`/api/edit-requests`)

#### Create Edit Request
```http
POST /api/edit-requests
Authorization: Bearer <student/counselor-token>
Content-Type: application/json

{
  "serviceId": "service_id",
  "sectionId": "section_id",
  "sectionInstanceId": "instance_id",
  "questionId": "question_id",
  "requestedValue": "new value",
  "reason": "Reason for edit",
  "studentId": "student_id" // Required if counselor making request
}
```

**Workflow:**
- Student/Counselor submits edit request
- System checks question's `editPolicy`
- Routes to appropriate approver (COUNSELOR or ADMIN)

#### Get Pending Edit Requests (Approver View)
```http
GET /api/edit-requests/pending
Authorization: Bearer <counselor/admin-token>
```

**Filtering:**
- Counselors see requests they can approve (based on editPolicy)
- Admins see all pending requests

#### Get My Edit Requests (Student View)
```http
GET /api/edit-requests/my-requests
Authorization: Bearer <student-token>
```

#### Approve Edit Request
```http
PATCH /api/edit-requests/:id/approve
Authorization: Bearer <counselor/admin-token>
```

**Actions:**
- Updates Answer document with new value
- Adds entry to update history
- Marks request as "approved"
- Records approver details

#### Reject Edit Request
```http
PATCH /api/edit-requests/:id/reject
Authorization: Bearer <counselor/admin-token>
Content-Type: application/json

{
  "rejectionReason": "Reason for rejection"
}
```

#### Get All Edit Requests (Admin View)
```http
GET /api/edit-requests?status=pending&studentId=xxx&serviceId=xxx
Authorization: Bearer <admin-token>
```

---

## 🔄 Complete Student Journey

### Step 1: Browse Services
```bash
GET /api/services
# Returns all active services
```

### Step 2: Enroll in Service
```bash
POST /api/enrollments
{
  "serviceId": "education_planning_id"
}
# Creates enrollment with status "not_started"
# Auto-creates Student profile if doesn't exist
```

### Step 3: Get Form Structure
```bash
GET /api/services/:serviceId
# Returns service with all sections and questions
```

### Step 4: Get Existing Answers (Auto-fill)
```bash
GET /api/answers/service/:serviceId
# Returns all answers for this service
# Auto-fills from other services if questions are shared
```

### Step 5: Fill Form (Real-time Save)
```bash
# Save each answer as user types
POST /api/answers/save
{
  "enrollmentId": "xxx",
  "sectionId": "personal_info_id",
  "questionId": "name_question_id",
  "value": "John Doe"
}
# Auto-updates enrollment to "in_progress" on first save
```

### Step 6: Add Repeatable Section Instances
```bash
# For education history, work experience, etc.
POST /api/answers/add-section-instance
{
  "enrollmentId": "xxx",
  "sectionId": "education_history_id"
}
# Returns new UUID for instance

# Fill answers for this instance
POST /api/answers/save
{
  "enrollmentId": "xxx",
  "sectionId": "education_history_id",
  "sectionInstanceId": "uuid-1",
  "questionId": "school_name_id",
  "value": "Harvard University"
}
```

### Step 7: Submit Form
```bash
POST /api/answers/submit
{
  "enrollmentId": "xxx"
}
# Changes status to "submitted"
```

### Step 8: Request Edit (Post-submission)
```bash
POST /api/edit-requests
{
  "serviceId": "xxx",
  "sectionId": "personal_info_id",
  "sectionInstanceId": "default-xxx",
  "questionId": "name_question_id",
  "requestedValue": "John Michael Doe",
  "reason": "Forgot middle name"
}
# Routes to counselor or admin based on question's editPolicy
```

### Step 9: Counselor/Admin Approves
```bash
PATCH /api/edit-requests/:requestId/approve
# Updates Answer document
# Student sees updated value
```

---

## 🎨 Key Features Implemented

### 1. ✅ Single Answer Document per Student
- One MongoDB document stores ALL answers
- Organized by section and instance
- Complete audit trail
- Efficient queries

### 2. ✅ Auto-fill Across Services
- Questions answered once, available everywhere
- Reduces student effort
- Maintains data consistency
- Smart section instance matching

### 3. ✅ Repeatable Sections
- Add/remove instances dynamically
- UUID-based instance tracking
- Min/max validation
- Perfect for education, work history

### 4. ✅ Real-time Saving
- Save on blur or change
- No "Save" button needed
- Auto-updates enrollment status
- Prevents data loss

### 5. ✅ Edit Governance
- Question-level edit policies
- Approval workflow
- Complete change history
- Notification ready (future)

### 6. ✅ Counselor Assignment
- Admin assigns counselor to enrollment
- Counselor sees assigned students
- Role-based access control

---

## 📊 Database Schema Highlights

### Answer Document Structure
```javascript
{
  student: ObjectId,
  answers: [
    {
      section: ObjectId,
      sectionInstanceId: "uuid-or-default",
      values: [
        {
          question: ObjectId,
          value: "actual answer",
          updateHistory: [
            {
              value: "previous value",
              updatedAt: Date,
              updatedBy: "STUDENT" | "COUNSELOR" | "ADMIN",
              updatedByUser: ObjectId
            }
          ]
        }
      ]
    }
  ]
}
```

### Enrollment Lifecycle
```
NOT_STARTED → IN_PROGRESS → SUBMITTED → COMPLETED
     ↓              ↓             ↓
  Created    First answer   Student    Counselor
             saved          submits    marks done
```

---

## 🔐 Authorization Matrix

| Endpoint | Student | Counselor | Admin |
|----------|---------|-----------|-------|
| Enroll in service | ✅ | ❌ | ❌ |
| Save answers | ✅ | ❌ | ❌ |
| Get my enrollments | ✅ | ❌ | ❌ |
| Get my students | ❌ | ✅ | ✅ |
| Assign counselor | ❌ | ❌ | ✅ |
| View student answers | ❌ | ✅ | ✅ |
| Create edit request | ✅ | ✅ | ❌ |
| Approve edit (STUDENT policy) | ❌ | ✅ | ✅ |
| Approve edit (COUNSELOR policy) | ❌ | ✅ | ✅ |
| Approve edit (ADMIN policy) | ❌ | ❌ | ✅ |

---

## 🧪 Testing Checklist

### Enrollment Flow
- [x] Student can enroll in service
- [x] Cannot enroll twice in same service
- [x] Auto-creates Student profile
- [x] Get my enrollments works
- [x] Admin can view all enrollments
- [x] Admin can assign counselor
- [x] Counselor can view assigned students

### Answer Flow
- [x] Save answer creates Answer document
- [x] Save answer updates existing answer
- [x] Update history is maintained
- [x] Enrollment status auto-updates to IN_PROGRESS
- [x] Get service answers returns correct structure
- [x] Auto-fill works across services

### Repeatable Sections
- [x] Can add section instance
- [x] UUID is generated
- [x] maxRepeats is enforced
- [x] Can remove section instance
- [x] minRepeats is enforced
- [x] Answers saved per instance

### Form Submission
- [x] Submit updates enrollment status
- [x] Submit works only for own enrollment

### Edit Requests
- [x] Student can create edit request
- [x] Counselor can create edit request for student
- [x] Pending requests filtered by editPolicy
- [x] Counselor can approve STUDENT/COUNSELOR policy
- [x] Admin can approve all policies
- [x] Approve updates Answer document
- [x] Reject records rejection reason
- [x] Student can view their requests

---

## 📝 API Summary

**Total Endpoints Added:** 20+

### Enrollment: 7 endpoints
- POST `/api/enrollments` - Enroll
- GET `/api/enrollments` - My enrollments
- GET `/api/enrollments/all` - All enrollments
- GET `/api/enrollments/my-students` - Counselor's students
- GET `/api/enrollments/:id` - Get by ID
- PATCH `/api/enrollments/:id/status` - Update status
- PATCH `/api/enrollments/:id/assign-counselor` - Assign counselor

### Answers: 6 endpoints
- POST `/api/answers/save` - Save answer
- GET `/api/answers/service/:serviceId` - Get with auto-fill
- POST `/api/answers/add-section-instance` - Add instance
- DELETE `/api/answers/remove-section-instance` - Remove instance
- POST `/api/answers/submit` - Submit form
- GET `/api/answers/student/:studentId` - View student answers

### Edit Requests: 6 endpoints
- POST `/api/edit-requests` - Create request
- GET `/api/edit-requests/pending` - Pending for approver
- GET `/api/edit-requests/my-requests` - My requests
- GET `/api/edit-requests` - All requests (admin)
- PATCH `/api/edit-requests/:id/approve` - Approve
- PATCH `/api/edit-requests/:id/reject` - Reject

---

## 🚀 Next Steps (Phase 3)

- [ ] Frontend implementation
- [ ] Form renderer component
- [ ] Repeatable section UI
- [ ] Auto-save on blur
- [ ] Progress indicator
- [ ] Validation engine
- [ ] Email notifications
- [ ] Real-time collaboration (future)

---

**Status:** Phase 2 Complete ✅
- All backend APIs implemented
- Authorization in place
- Data integrity maintained
- Ready for frontend integration

