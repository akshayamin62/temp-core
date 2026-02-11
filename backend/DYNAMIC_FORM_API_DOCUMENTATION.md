# Dynamic Service Form System - API Documentation

## Overview
This system implements a production-grade dynamic form architecture for consultancy services with:
- Reusable questions and sections
- Repeatable sections (education, work experience, etc.)
- Single source of truth for student answers
- Auto-fill across services
- Edit approval workflow

---

## 📋 Table of Contents
1. [Models](#models)
2. [Question APIs](#question-apis)
3. [Service APIs](#service-apis)
4. [Section APIs](#section-apis)
5. [Workflow Examples](#workflow-examples)

---

## Models

### 1. Student
- Links to User model
- One student profile per user
- All answers reference student

### 2. Counselor
- Links to User model
- Has specializations (array of service IDs)
- Can be assigned to enrollments

### 3. Question (Atomic Unit)
```json
{
  "_id": "auto-generated",
  "label": "What is your name?",
  "type": "text | number | date | select | multiselect",
  "options": ["Option 1", "Option 2"], // For select/multiselect
  "editPolicy": "STUDENT | COUNSELOR | ADMIN",
  "isActive": true
}
```

### 4. Service (Business Offering)
```json
{
  "_id": "auto-generated",
  "name": "Education Planning",
  "description": "Complete education planning service",
  "isActive": true
}
```

### 5. FormSection (Structure + Repeatability)
```json
{
  "_id": "auto-generated",
  "title": "Education History",
  "description": "Your academic background",
  "isRepeatable": true,
  "minRepeats": 0,
  "maxRepeats": 10,
  "questions": [
    {
      "question": "questionId",
      "isIncluded": true,
      "isRequired": true,
      "isEditable": true,
      "order": 1
    }
  ],
  "isGlobal": false,
  "createdBy": "userId",
  "usedInServices": ["serviceId1", "serviceId2"],
  "isActive": true
}
```

### 6. ServiceSection (Junction Table)
Links services to formsections with ordering

### 7. Enrollment
Tracks student service enrollment lifecycle

### 8. Answer (Single Document per Student)
```json
{
  "_id": "auto-generated",
  "student": "studentId",
  "answers": [
    {
      "section": "sectionId",
      "sectionInstanceId": "uuid-for-repeatable",
      "values": [
        {
          "question": "questionId",
          "value": "answer value",
          "updateHistory": [
            {
              "value": "previous value",
              "updatedAt": "2024-01-01",
              "updatedBy": "STUDENT",
              "updatedByUser": "userId"
            }
          ]
        }
      ]
    }
  ]
}
```

### 9. EditRequest
Manages post-submission edit approvals

---

## Question APIs

### Get Question Metadata
```http
GET /api/questions/metadata
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "questionTypes": ["text", "number", "date", "select", "multiselect"],
    "editPolicies": ["STUDENT", "COUNSELOR", "ADMIN"]
  }
}
```

### Create Question
```http
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "What is your current education level?",
  "type": "select",
  "options": ["High School", "Bachelor's", "Master's", "PhD"],
  "editPolicy": "COUNSELOR"
}
```

### Get All Questions
```http
GET /api/questions?type=select&isActive=true&search=education
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` - Filter by question type
- `editPolicy` - Filter by edit policy
- `isActive` - Filter active/inactive
- `search` - Search in label

### Get Question by ID
```http
GET /api/questions/:id
Authorization: Bearer <token>
```

### Update Question
```http
PUT /api/questions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Updated label",
  "isActive": true
}
```

### Delete Question (Soft Delete)
```http
DELETE /api/questions/:id
Authorization: Bearer <token>
```

---

## Service APIs

### Create Service
```http
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Education Planning",
  "description": "Comprehensive education planning and counseling service"
}
```

### Get All Services
```http
GET /api/services?isActive=true&search=education
Authorization: Bearer <token>
```

### Get Service by ID (with sections)
```http
GET /api/services/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": { /* service object */ },
    "sections": [
      {
        "_id": "serviceSectionId",
        "service": "serviceId",
        "section": { /* full section object with questions */ },
        "order": 1,
        "isActive": true
      }
    ]
  }
}
```

### Update Service
```http
PUT /api/services/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Service Name",
  "description": "Updated description",
  "isActive": true
}
```

### Delete Service (Soft Delete)
```http
DELETE /api/services/:id
Authorization: Bearer <token>
```

---

## Section APIs

### Create Section
```http
POST /api/sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Education History",
  "description": "Your academic background",
  "isRepeatable": true,
  "minRepeats": 1,
  "maxRepeats": 5,
  "questions": [
    {
      "question": "questionId1",
      "isIncluded": true,
      "isRequired": true,
      "isEditable": true,
      "order": 1
    },
    {
      "question": "questionId2",
      "isIncluded": true,
      "isRequired": false,
      "isEditable": true,
      "order": 2
    }
  ],
  "isGlobal": true
}
```

### Get All Sections
```http
GET /api/sections?isGlobal=true&isActive=true&search=education
Authorization: Bearer <token>
```

**Query Parameters:**
- `isGlobal` - Filter global/local sections
- `isActive` - Filter active/inactive
- `search` - Search in title

### Get Section by ID
```http
GET /api/sections/:id
Authorization: Bearer <token>
```

### Update Section
```http
PUT /api/sections/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "questions": [
    // Existing questions...
    {
      "question": "newQuestionId",
      "isIncluded": true,
      "isRequired": false,
      "isEditable": true,
      "order": 3
    }
  ]
}
```

**Important:** If section is used in services, you can only APPEND questions, not remove them.

### Delete Section (Soft Delete)
```http
DELETE /api/sections/:id
Authorization: Bearer <token>
```

---

## Service-Section Management

### Add Section to Service
```http
POST /api/services/:serviceId/sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "sectionId": "sectionId",
  "order": 1
}
```

### Remove Section from Service
```http
DELETE /api/services/:serviceId/sections/:sectionId
Authorization: Bearer <token>
```

### Update Section Order in Service
```http
PATCH /api/services/:serviceId/sections/:sectionId/order
Authorization: Bearer <token>
Content-Type: application/json

{
  "order": 3
}
```

---

## Workflow Examples

### Example 1: Create a Complete Service

#### Step 1: Create Questions
```bash
# Create name question
POST /api/questions
{
  "label": "What is your full name?",
  "type": "text",
  "editPolicy": "STUDENT"
}
# Save returned ID as: nameQuestionId

# Create education level question
POST /api/questions
{
  "label": "Education Level",
  "type": "select",
  "options": ["High School", "Bachelor's", "Master's", "PhD"],
  "editPolicy": "COUNSELOR"
}
# Save returned ID as: eduLevelQuestionId
```

#### Step 2: Create a Section
```bash
POST /api/sections
{
  "title": "Personal Information",
  "description": "Basic personal details",
  "isRepeatable": false,
  "questions": [
    {
      "question": "nameQuestionId",
      "isIncluded": true,
      "isRequired": true,
      "isEditable": true,
      "order": 1
    },
    {
      "question": "eduLevelQuestionId",
      "isIncluded": true,
      "isRequired": true,
      "isEditable": true,
      "order": 2
    }
  ],
  "isGlobal": true
}
# Save returned ID as: personalInfoSectionId
```

#### Step 3: Create a Service
```bash
POST /api/services
{
  "name": "Education Planning",
  "description": "Complete education planning service"
}
# Save returned ID as: eduPlanningServiceId
```

#### Step 4: Add Section to Service
```bash
POST /api/services/eduPlanningServiceId/sections
{
  "sectionId": "personalInfoSectionId",
  "order": 1
}
```

### Example 2: Reuse Section in Another Service

#### Step 1: Create Second Service
```bash
POST /api/services
{
  "name": "Study Abroad Counseling",
  "description": "Study abroad consultation service"
}
# Save returned ID as: studyAbroadServiceId
```

#### Step 2: Reuse Existing Section
```bash
POST /api/services/studyAbroadServiceId/sections
{
  "sectionId": "personalInfoSectionId",
  "order": 1
}
```

#### Step 3: Append New Question to Shared Section
```bash
# Create new question
POST /api/questions
{
  "label": "Preferred country for study?",
  "type": "select",
  "options": ["USA", "UK", "Canada", "Australia"],
  "editPolicy": "STUDENT"
}
# Save returned ID as: countryQuestionId

# Update section (append only)
PUT /api/sections/personalInfoSectionId
{
  "questions": [
    // ... keep existing questions ...
    {
      "question": "countryQuestionId",
      "isIncluded": true,
      "isRequired": true,
      "isEditable": true,
      "order": 3
    }
  ]
}
```

**Result:** New question appears in BOTH services! 🎉

---

## Key Design Features

### ✅ Section Reusability
- Create a section once
- Use in multiple services
- Append new questions (no deletion when used)
- Changes reflect across all services

### ✅ Question Library
- Questions are atomic and reusable
- One question can be used in multiple sections
- Edit policy controls approval flow

### ✅ Repeatable Sections
- Set `isRepeatable: true`
- Define min/max repetitions
- Perfect for education history, work experience, etc.

### ✅ Flexible Configuration
- `isIncluded` - Admin toggle ON/OFF
- `isRequired` - Validation rule
- `isEditable` - Lock after filling
- `order` - Display sequence

### ✅ Single Answer Document
- One document per student
- All answers across all services
- Complete audit trail
- Auto-fill across services

---

## Testing Order

1. ✅ Create questions (at least 5-10)
2. ✅ Create sections with those questions
3. ✅ Create services
4. ✅ Add sections to services
5. ✅ Test section reusability
6. ✅ Test appending questions to used sections
7. ✅ Verify changes reflect in all services

---

## Next Steps (Not Yet Implemented)

- [ ] Enrollment management
- [ ] Answer saving/fetching
- [ ] Form rendering for students
- [ ] Resume/auto-fill logic
- [ ] EditRequest workflow
- [ ] Counselor assignment
- [ ] Frontend UI for all features

---

## Notes

- All routes require authentication (JWT token)
- Admin routes require ADMIN role
- MongoDB auto-generates `_id` fields
- Soft deletes preserve data integrity
- Section reusability prevents data inconsistency

---

**Status:** Phase 1 Complete ✅
- 8 Models created
- Question CRUD complete
- Service CRUD complete
- Section CRUD with reusability complete
- Service-Section linking complete

