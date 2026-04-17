# Study Abroad — Email & WhatsApp Notification System Plan

> This document lists every event in the Study Abroad workflow where email and/or WhatsApp notifications should be sent, along with templates and a red-dot in-app notification system design.

---

## Existing Infrastructure

| Component | Status |
|-----------|--------|
| Email (Nodemailer/Gmail SMTP) | ✅ `utils/email.ts` — `sendEmail()`, `sendOTPEmail()` |
| WhatsApp (WhatAPI webhook) | ✅ `utils/whatsapp.ts` — `sendWhatsAppRegistrationMessage()` |
| In-App Notifications (Ivy League only) | ✅ `PointerNotification` model + service (pointer-level red dots) |

---

## Notification Events — Complete List

### PHASE 1: Lead → Student Conversion

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 1 | New enquiry submitted | `leadController.submitEnquiry` | Admin + Counselor | ✅ | — |
| 2 | Lead assigned to counselor | `leadController.assignLeadToCounselor` | Counselor | ✅ | — |
| 3 | Follow-up scheduled | `followUpController.createFollowUp` | Lead (student/parent) | ✅ | ✅ |
| 4 | Conversion request submitted | `leadStudentConversionController.requestConversion` | Admin | ✅ | — |
| 5 | Conversion approved (account created) | `leadStudentConversionController.approveConversion` | Student + Parent | ✅ | ✅ |
| 6 | Conversion rejected | `leadStudentConversionController.rejectConversion` | Counselor | ✅ | — |

### PHASE 2: Service Registration & OPS Assignment

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 7 | Student registered for Study Abroad | `serviceController.registerForService` | OPS + Super Admin | ✅ | ✅ |
| 8 | OPS assigned to student | Admin panel (SSR update) | Student + OPS | ✅ | ✅ |

### PHASE 3: Profile Form

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 9 | Student completed profile form | `formAnswerController.saveFormAnswers` (when all sections done) | OPS | ✅ | ✅ |
| 10 | OPS requests form corrections | (new action needed) | Student | ✅ | ✅ |

### PHASE 4: Programs / Applications

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 11 | OPS/Admin suggests a program | `programController.createProgram` (by OPS/Admin) | Student | ✅ | ✅ |
| 12 | Student selects a program | `programController.selectProgram` | OPS | ✅ | ✅ |
| 13 | Program status updated (In Progress → Applied) | `programController.updateProgram` | Student | ✅ | ✅ |
| 14 | Offer received | `programController.updateProgram` (status = Offer Received) | Student + Parent | ✅ | ✅ |
| 15 | Offer accepted | `programController.updateProgram` (status = Offer Accepted) | OPS + Admin | ✅ | ✅ |
| 16 | Offer declined | `programController.updateProgram` (status = Offer Declined) | OPS | ✅ | — |
| 17 | Application closed | `programController.updateProgram` (status = Closed) | Student | ✅ | — |

### PHASE 5: Documents

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 18 | New document requirement added | `coreDocumentController.addCOREDocumentField` | Student | ✅ | ✅ |
| 19 | Student uploads a document | `documentController.uploadDocument` (by student) | OPS | ✅ | — |
| 20 | Document approved | `documentController.approveDocument` | Student | ✅ | ✅ |
| 21 | Document rejected | `documentController.rejectDocument` | Student | ✅ | ✅ |

### PHASE 6: Chat / Messaging

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 22 | OPS/Admin sends message to student | `chatController.sendMessage` (by non-student) | Student | ✅ | ✅ |
| 23 | Student sends message | `chatController.sendMessage` (by student) | OPS | — | — |
| 24 | Document shared in chat | `chatController.uploadChatDocument` | All chat participants | ✅ | — |

### PHASE 7: Team Meetings

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 25 | Meeting requested | `teamMeetController.createTeamMeet` | Requested participant | ✅ | ✅ |
| 26 | Meeting confirmed | `teamMeetController.confirmTeamMeet` | Requester | ✅ | ✅ |
| 27 | Meeting cancelled | `teamMeetController.cancelTeamMeet` | All participants | ✅ | ✅ |
| 28 | Meeting rejected | `teamMeetController.rejectTeamMeet` | Requester | ✅ | — |

### PHASE 8: OPS Task Reminders

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 29 | New task created for student | `opsScheduleController.createSchedule` | OPS (self-reminder) | ✅ | — |
| 30 | Task due today (daily digest) | Cron job (morning) | OPS | ✅ | ✅ |
| 31 | Missed task reminder | Cron job (next morning) | OPS | ✅ | ✅ |

### PHASE 9: Service Completion

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|--------------|------------|-------|----------|
| 32 | Service registration completed | `programController.updateProgram` (completedAt set) | Student + Parent + Admin | ✅ | ✅ |

---

## WhatsApp Templates (For Meta Business Approval)

> WhatsApp Business API requires pre-approved templates. Below are template definitions with variable placeholders `{{1}}`, `{{2}}`, etc.

### Template 1: `account_created`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
Your account has been created successfully on Admitra.
Please find the details below for your reference.
{{2}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
Your account has been created successfully on Admitra.
Please find the details below for your reference.
Please use akshay.amin.62@gmail.com as your login email when signing in to core.admitra.io.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 2: `program_added_notification`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
A list of new programs has been suggested for you.
Please find the details below for your reference.
{{2}} at {{3}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
A list of new programs has been suggested for you.
Please find the details below for your reference.
MS in Computer Science at MIT - United States.

🙂 Thanks for taking a moment to read this message.
```
How to use.
WHATSAPP_WEBHOOK_URL?number=919601373545&message=program%20added%20notification,%20Akshay%20Amin,%20MS%20in%20Computer%20Science,%20MIT%20-%20United%20States.

---

### Template 3: `program_status_update`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
There is an update on your application.
{{2}} — Status: {{3}}.

Kindly take a look.
```

**Sample:**
```
Hello, Akshay Amin
There is an update on your application.
MS in Computer Science at MIT — Status: Offer Received.

Kindly take a look.
```

how to Use:
WHATSAPP_WEBHOOK_URL?number=919601373545&message=program%20status%20update,%20Akshay%20Amin,%20MS%20in%20Computer%20Science%20at%20MIT,%20Offer%20Received

---

### Template 4: `document_action`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
{{2}}
Please find the details below for your reference.
{{3}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample (approval):**
```
Hello, Akshay Amin
Your document has been approved.
Please find the details below for your reference.
Document "Passport Copy" has been approved by your OPS team.

🙂 Thanks for taking a moment to read this message.
```

**Sample (rejection):**
```
Hello, Akshay Amin
Your document has been rejected and needs to be re-uploaded.
Please find the details below for your reference.
Document "SOP Draft" was rejected — Reason: Please include your motivation for choosing this university.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 5: `new_document_required`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
A new document has been requested from you.
Please find the details below for your reference.
{{2}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
A new document has been requested from you.
Please find the details below for your reference.
Please upload your "Letter of Recommendation" at your earliest convenience on core.admitra.io.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 6: `staff_message_to_student`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
You have a new message regarding your {{2}}.
Please find the details below for your reference.
{{3}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
You have a new message regarding your Study Abroad service.
Please find the details below for your reference.
Your OPS sent a message about "MS in CS at MIT". Please log in to core.admitra.io to view and reply.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 7: `meeting_invite`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
A meeting has been scheduled for you.
Please find the details below for your reference.
{{2}} on {{3}} at {{4}}. {{5}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
A meeting has been scheduled for you.
Please find the details below for your reference.
Application Review with Priya Sharma on 15 Apr 2026 at 3:00 PM. Join at: https://meeting.zoho.com/xyz.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 8: `student_selected_program`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}

{{2}} selected a program "{{3}}" at {{4}}.

Kindly take a look.
```

**Sample:**
```
Hello, Priya Sharma

Akshay Amin selected a program "MS in Computer Science" at MIT.

Kindly take a look.
```

How to Use:
WHATSAPP_WEBHOOK_URL?number=919601373545&message=student%20selected%20program,Priya%20Sharma,Akshay%20Amin,MS%20in%20Computer%20Science,MIT
---

### Template 9: `offer_received`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}

🎉 Congratulations! You have received an offer!

{{2}} at {{3}} — You have received an admission offer!

Please log in to core.admitra.io to review and respond.

Thank you for keeping us in business
```

**Sample:**
```
Hello, Akshay Amin

🎉 Congratulations! You have received an offer!

MS in Computer Science at MIT — You have received an admission offer! 

Please log in to core.admitra.io to review and respond.

Thank you for keeping us in business
```

How to Use:
WHATSAPP_WEBHOOK_URL?number=919601373545&message=ffer%20received,Akshay%20Amin,MS%20in%20Computer%20Science,MIT

---

### Template 10: `follow_up_reminder`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
This is a reminder for your upcoming session.
Please find the details below for your reference.
{{2}} on {{3}} at {{4}}.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
This is a reminder for your upcoming session.
Please find the details below for your reference.
Counseling session with Priya Sharma on 10 Apr 2026 at 11:00 AM.

🙂 Thanks for taking a moment to read this message.
```

---

### Template 11: `staff_assignment_to_student`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}
An OPS has been assigned to your service.
Please find the details below for your reference.
{{2}} will be guiding you through your Study Abroad journey. Feel free to log in to core.admitra.io to get started.

🙂 Thanks for taking a moment to read this message.
```

**Sample:**
```
Hello, Akshay Amin
An OPS has been assigned to your service.
Please find the details below for your reference.
Priya Sharma will be guiding you through your Study Abroad journey. Feel free to log in to core.admitra.io to get started.

🙂 Thanks for taking a moment to read this message.
```

---

## Email Templates — Samples

All emails should use a consistent branded HTML template. Below are subject lines and body content.

### Email 1: Program Suggested
**Subject:** `New Program Suggestion — {programName} at {university}`
```
Hi {studentName},

Your OPS team has suggested a new program for you:

📚 Program: {programName}
🏫 University: {university}
🌍 Country: {country}
📅 Intake: {intake} {year}

Log in to review and select this program:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 2: Student Selected a Program
**Subject:** `{studentName} selected a program — Action needed`
```
Hi {opsName},

{studentName} has selected a program for application:

📚 Program: {programName}
🏫 University: {university}
⭐ Priority: {priority}

Please review and proceed with the application process.
https://core.admitra.io/ops/dashboard

Best regards,
Admitra Team
```

### Email 3: Document Approved
**Subject:** `Document Approved — {documentName}`
```
Hi {studentName},

Your document "{documentName}" has been reviewed and approved. ✅

No further action is needed for this document.

Track your progress:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 4: Document Rejected
**Subject:** `Action Required — Please re-upload {documentName}`
```
Hi {studentName},

Your document "{documentName}" requires revision. ❌

Reason: {rejectionReason}

Please upload a corrected version:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 5: New Message from OPS
**Subject:** `New message about {programName}`
```
Hi {studentName},

You have a new message from {senderName} regarding {programName} at {university}.

Log in to view and reply:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 6: Offer Received
**Subject:** `🎉 Congratulations! Offer from {university}`
```
Hi {studentName},

Great news! You have received an admission offer:

📚 Program: {programName}
🏫 University: {university}
🌍 Country: {country}

Please log in to review the offer and take the next steps:
https://core.admitra.io/dashboard

Congratulations!
Admitra Team
```

### Email 7: Meeting Scheduled
**Subject:** `Meeting Scheduled — {subject} on {date}`
```
Hi {participantName},

A meeting has been scheduled:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
⏱ Duration: {duration} minutes
📍 Type: {Online/In-Person}
{🔗 Join Link: {meetingLink} (if online)}

Best regards,
Admitra Team
```

### Email 8: New Document Required
**Subject:** `New Document Required — {documentName}`
```
Hi {studentName},

Your OPS team has requested a new document:

📄 Document: {documentName}
📂 Category: {CORE/EXTRA}

Please upload it at your earliest convenience:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 9: Application Status Update
**Subject:** `Application Update — {programName} at {university}`
```
Hi {studentName},

There is an update on your application:

📚 Program: {programName}
🏫 University: {university}
📊 New Status: {status}

Log in for more details:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

### Email 10: Profile Form Completed (to OPS)
**Subject:** `{studentName} completed their profile form`
```
Hi {opsName},

{studentName} has completed all sections of their profile form.

Please review the submitted information and proceed with the next steps.

https://core.admitra.io/ops/dashboard

Best regards,
Admitra Team
```

---

## Red Dot In-App Notification System — Design

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                  StudyAbroadNotification              │
│  (New Mongoose Model)                                │
├──────────────────────────────────────────────────────┤
│  userId          : ObjectId (ref: User)              │
│  registrationId  : ObjectId (ref: SSR)               │
│  category        : enum (see below)                  │
│  title           : string ("New program suggested")  │
│  message         : string (details)                  │
│  referenceId     : ObjectId (program/doc/chat)       │
│  referenceType   : enum (program/document/chat/...)  │
│  isRead          : boolean (default: false)          │
│  createdAt       : Date                              │
│  updatedAt       : Date                              │
└──────────────────────────────────────────────────────┘

Categories:
  - PROGRAM        (suggest, select, status change, offer)
  - DOCUMENT       (upload, approve, reject, new requirement)
  - MESSAGE        (new chat message)
  - MEETING        (scheduled, confirmed, cancelled)
  - PROFILE        (form corrections needed)
  - ASSIGNMENT     (OPS assigned)
  - GENERAL        (service registered, completed)
```

### How It Works

1. **Backend**: Whenever an event from the table above fires, the controller also calls `createNotification(userId, category, title, message, referenceId)` to write a record.

2. **Frontend API Polling**: A lightweight poll every 30–60 seconds from the dashboard layout:
   ```
   GET /api/notifications/unread-count?userId=xxx
   → { total: 5, byCategory: { PROGRAM: 2, DOCUMENT: 3 } }
   ```

3. **Red Dot Display**:
   - **Sidebar items**: Each nav item (Programs, Documents, Messages, Meetings) shows a red dot badge with the count for its category.
   - **Top-level bell icon**: Shows total unread count.
   - When user navigates to a section, call `POST /api/notifications/mark-read` for that category.

4. **Both Student & OPS sides**: Each side has its own notifications — students see program suggestions, document actions, messages; OPS sees student uploads, program selections, form completions.

### Is This Optimal for Deployment?

| Aspect | Assessment |
|--------|-----------|
| **Database load** | Low — one small document per event, indexed on `userId + isRead`. Polling query is fast. |
| **Scalability** | Good — for 100s of students, a 30s poll interval is negligible. For 10,000+ users, switch to WebSockets/SSE. |
| **Alternative: WebSockets** | More real-time but adds infrastructure complexity (Socket.io server, connection management). Not needed at current scale. |
| **Alternative: Push notifications** | Browser push via Service Workers. Good complement but not a replacement for in-app dots. Can be added later. |
| **Storage** | ~500 bytes per notification. 50 events/student/month × 1000 students = ~25MB/month. Negligible. Archive after 90 days. |
| **Recommendation** | **Start with polling (30s interval)**. It's simple, reliable, and sufficient for the current user base. Add WebSocket upgrade path when concurrent users exceed 500+. |

### Implementation Steps (When Ready)

1. Create `StudyAbroadNotification` model (similar to existing `PointerNotification`)
2. Create `studyAbroadNotification.service.ts` with `createNotification()`, `getUnreadCounts()`, `markAsRead()`
3. Add notification creation calls inside each controller at the trigger points listed above
4. Create API routes: `GET /notifications/study-abroad/unread`, `POST /notifications/study-abroad/mark-read`
5. Frontend: Add `useNotifications()` hook with polling, render red dots in sidebar
6. Add WhatsApp + email dispatch alongside notification creation (one helper function that does all three)

---

## Priority Order for Implementation

| Priority | Events | Why |
|----------|--------|-----|
| **P0 — Must have** | #11 Program suggested, #12 Student selects, #13-14 Status updates + Offer, #20-21 Doc approved/rejected, #22 Message from OPS | These are the core actions students and OPS wait on daily |
| **P1 — Important** | #18 New doc required, #25-27 Meetings, #5 Account created, #8 OPS assigned, #9 Profile completed | Important touchpoints but less frequent |
| **P2 — Nice to have** | #1-4 Lead/enquiry events, #6 Conversion rejected, #19 Student uploads doc, #29-31 OPS task reminders | Internal team events, lower urgency for notifications |
