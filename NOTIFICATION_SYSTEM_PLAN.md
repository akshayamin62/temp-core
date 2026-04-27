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

### Template 6: `staff message to student`
**Category:** UTILITY  
**Language:** English

```
Hello, {{1}}

You have a new message regarding your {{2}}.
{{3}} - {{4}}.

Thank you for keeping us in business.
```

**Sample:**
```
Hello, Akshay Amin
You have a new message regarding your Study Abroad service.
Please upload all the document and complete your profile as soon as possible - Priya Sharma(OPS).

Thank you for keeping us in business.
```

How to Use
WHATSAPP_WEBHOOK_URL?number=919601373545&message=staff%20message%20to%20student,Akshay%20Amin,%20Study%20Abroad%20Service,Please%20upload%20all%20the%20document%20and%20complete%20your%20profile%20as%20soon%20as%20possible,Priya%20Sharma(OPS)

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

## PHASE 10 (NEW): Lead, B2B Lead, Referrer & Follow-Up & Team Meet Notifications

> Status: **PENDING APPROVAL** — templates below are proposals for review before implementation.

---

### Notification Events Table

| # | Event | Trigger Point | Notify Who | Email | WhatsApp |
|---|-------|---------------|------------|-------|----------|
| 33 | Admin/Advisor lead enquiry submitted | `leadController.submitEnquiry` | Lead (enquirer) | ✅ | ✅ |
| 34 | Referral enquiry submitted | `referrerController.submitReferralEnquiry` | Lead (enquirer) | ✅ | ✅ |
| 35 | B2B enquiry submitted (Franchise / Advisor / Referrer) | `b2bLeadController.submitB2BEnquiry` | B2B Lead (enquirer) | ✅ (exists) | ✅ (new) |
| 36 | Counselor / B2B Sales creates a follow-up | `followUpController.createFollowUp` / `b2bFollowUpController.createB2BFollowUp` | Lead | ✅ (exists for meeting email) | ✅ (new) |
| 37 | Follow-up status saved / updated | `followUpController.updateFollowUp` / `b2bFollowUpController.updateB2BFollowUp` | Lead | ✅ | ✅ |
| 38 | Team meet created (sender → receiver) | `teamMeetController.createTeamMeet` | Receiver | ✅ (exists `sendMeetingPendingEmail`) | ✅ (new) |
| 39 | Team meet accepted / confirmed | `teamMeetController.acceptTeamMeet` | Both sender & receiver | ✅ (exists `sendMeetingConfirmedEmail`) | ✅ (new — include Zoho link if online) |
| 40 | Team meet rejected | `teamMeetController.rejectTeamMeet` | Sender | ✅ | ✅ |
| 41 | Team meet cancelled | `teamMeetController.cancelTeamMeet` | Both sender & receiver | ✅ | ✅ |

---

### WhatsApp Template 12: `enquiry welcome` — Unified Enquiry Welcome (Lead / Referral / B2B)

**Category:** UTILITY
**Language:** English
**Triggers:**
- `leadController.submitEnquiry` (admin/advisor slug)
- `referrerController.submitReferralEnquiry`
- `b2bLeadController.submitB2BEnquiry`
**Recipient:** The person who just submitted any enquiry form

> **Note:** Templates 12 and 13 are merged into one. `{{2}}` is dynamically set by the system based on enquiry type.

```
Hello, {{1}}

Thank you for your enquiry!

We have received {{2}}.

Our team will review your details and get in touch with you shortly.

Thank you for keeping us in business.
```

**Variables:**
| Var | Value |
|-----|-------|
| `{{1}}` | Enquirer's name (full name for Lead/Referral; first name for B2B) |
| `{{2}}` | Dynamically set: |
| | **Lead**: `your request for {serviceTypes}` (e.g. `your request for Study Abroad; Coaching`) |
| | **B2B**: `your {type} partnership enquiry` (e.g. `your Franchise partnership enquiry`) |
| | **Referral**: `your request for referral with {admin company name}` (e.g. `your request for referral with Kareer Studio`) |

**Sample (Lead):**
```
Hello, Akshay Amin

Thank you for your enquiry!

We have received your request for Study Abroad; Coaching.

Our team will review your details and get in touch with you shortly.

Thank you for keeping us in business.
```

**Sample (B2B):**
```
Hello, Akshay

Thank you for your enquiry!

We have received your Franchise partnership enquiry.

Our team will review your details and get in touch with you shortly.

Thank you for keeping us in business.
```

**Sample (Referral):**
```
Hello, Akshay Amin

Thank you for your enquiry!

We have received your request for referral with Kareer Studio.

Our team will review your details and get in touch with you shortly.

Thank you for keeping us in business.
```

**How to use:**
```
WHATSAPP_WEBHOOK_URL?number=91{mobileNumber}&message=enquiry%20welcome,Akshay%20Amin,your%20request%20for%20Study%20Abroad
```

---

### WhatsApp Templates 14–19: Reuse `general 3 line notification`

> **All follow-up and team meet notification templates reuse the single existing template: `general 3 line notification`.**
> No new WhatsApp templates need to be created for these notifications.

**Template structure (existing):**
```
Hello, {{1}}
{{2}}
Please find the details below for your reference.
{{3}}.

Thank you for keeping us in business.
```

**Webhook format:**
```
WHATSAPP_WEBHOOK_URL?number=91{mobileNumber}&message=general%203%20line%20notification,{name},{line2},{line3}
```

---

#### Template 14: Follow-Up Scheduled (to Lead)
**Trigger:** `followUpController.createFollowUp` / `b2bFollowUpController.createB2BFollowUp`

| Variable | Value |
|----------|-------|
| `{{1}}` | Lead full name |
| `{{2}}` | `A follow-up session has been scheduled for you.` |
| `{{3}}` | **Online:** `Follow-up #{n} with {counselor} on {date} at {time} ({duration} mins). Join at: {zohoUrl}` |
| | **Offline:** `Follow-up #{n} with {counselor} on {date} at {time} ({duration} mins). Offline meeting.` |

**Sample (Online):**
```
Hello, Akshay Amin
A follow-up session has been scheduled for you.
Please find the details below for your reference.
Follow-up #1 with Priya Sharma on Monday; 28 Apr 2026 at 11:00 AM (30 mins). Join at: https://meeting.zoho.com/xyz.

Thank you for keeping us in business.
```

---

#### Template 15: Follow-Up Status Updated (to Lead)
**Trigger:** `followUpController.updateFollowUp` / `b2bFollowUpController.updateB2BFollowUp`

| Variable | Value |
|----------|-------|
| `{{1}}` | Lead full name |
| `{{2}}` | `There is an update on your follow-up session.` |
| `{{3}}` | `Follow-up #{n} - Status: {statusLabel}. {notes if present}` |

**Status label map:**
| System Value | Display |
|---|---|
| `SCHEDULED` | Scheduled | `COMPLETED` | Completed | `NO_SHOW` | No Show | `RESCHEDULED` | Rescheduled | `CANCELLED` | Cancelled | `INTERESTED` | Interested | `NOT_INTERESTED` | Not Interested | `CONVERTED_TO_STUDENT` | Converted to Student | `CONVERTED` | Converted |

**Sample:**
```
Hello, Akshay Amin
There is an update on your follow-up session.
Please find the details below for your reference.
Follow-up #1 - Status: Completed. Thank you for your time today.

Thank you for keeping us in business.
```

---

#### Template 16: Team Meet Requested (to Receiver)
**Trigger:** `teamMeetController.createTeamMeet` *(Zoho link not yet available — created on accept)*

| Variable | Value |
|----------|-------|
| `{{1}}` | Receiver full name |
| `{{2}}` | `You have a new meeting request from {senderName}.` |
| `{{3}}` | `"{subject}" on {date} at {time} ({duration} mins; {type}). Kindly log in to confirm or decline.` |

**Sample:**
```
Hello, Priya Sharma
You have a new meeting request from Akshay Amin.
Please find the details below for your reference.
"Application Review" on Tuesday; 29 Apr 2026 at 3:00 PM (30 mins; Online). Kindly log in to confirm or decline.

Thank you for keeping us in business.
```

---

#### Template 17: Team Meet Confirmed (to Both Parties)
**Trigger:** `teamMeetController.acceptTeamMeet` *(Zoho meeting created at this point)*

| Variable | Value |
|----------|-------|
| `{{1}}` | Participant full name |
| `{{2}}` | `Your meeting with {otherParty} has been confirmed.` |
| `{{3}}` | **Online:** `"{subject}" on {date} at {time} ({duration} mins). Meeting ID: {id} \| Password: {pass} \| Join at: {url}` |
| | **Offline:** `"{subject}" on {date} at {time} ({duration} mins). In-Person meeting. Please be on time.` |

**Sample (Online):**
```
Hello, Akshay Amin
Your meeting with Priya Sharma has been confirmed.
Please find the details below for your reference.
"Application Review" on Tuesday; 29 Apr 2026 at 3:00 PM (30 mins). Meeting ID: 1036588582 | Password: nsPd75 | Join at: https://meeting.zoho.com/xyz.

Thank you for keeping us in business.
```

---

#### Template 18: Team Meet Rejected (to Sender)
**Trigger:** `teamMeetController.rejectTeamMeet`

| Variable | Value |
|----------|-------|
| `{{1}}` | Sender full name |
| `{{2}}` | `Your meeting request was declined by {receiverName}.` |
| `{{3}}` | `"{subject}" on {date} at {time}. Reason: {rejectionMessage}. You can reschedule from your dashboard.` |

**Sample:**
```
Hello, Akshay Amin
Your meeting request was declined by Priya Sharma.
Please find the details below for your reference.
"Application Review" on Tuesday; 29 Apr 2026 at 3:00 PM. Reason: I am unavailable at this time. You can reschedule from your dashboard.

Thank you for keeping us in business.
```

---

#### Template 19: Team Meet Cancelled (to Receiver)
**Trigger:** `teamMeetController.cancelTeamMeet`

| Variable | Value |
|----------|-------|
| `{{1}}` | Receiver full name |
| `{{2}}` | `A meeting has been cancelled.` |
| `{{3}}` | `"{subject}" with {senderName} that was scheduled on {date} at {time} has been cancelled.` |

**Sample:**
```
Hello, Priya Sharma
A meeting has been cancelled.
Please find the details below for your reference.
"Application Review" with Akshay Amin that was scheduled on Tuesday; 29 Apr 2026 at 3:00 PM has been cancelled.

Thank you for keeping us in business.
```

---

### Email Template 11: Enquiry Welcome (Lead / Referral)

**Subject:** `Thank you for your enquiry — {serviceTypes}`
**Trigger:** `leadController.submitEnquiry`, `referrerController.submitReferralEnquiry`

```
Hi {leadName},

Thank you for reaching out to us!

We have received your enquiry for the following service(s):
📌 {serviceTypes}

Our team will review your details and get in touch with you shortly.

In the meantime, if you have any questions, feel free to reply to this email.

Best regards,
Admitra Team
```

---

### Email Template 12: B2B Enquiry Welcome

**Subject:** `Thank you for your B2B partnership enquiry — {type}`
**Trigger:** `b2bLeadController.submitB2BEnquiry`
**Note:** This partially exists (`sendB2BEnquiryConfirmationEmail`). The current email should be verified against this template.

```
Hi {firstName},

Thank you for your interest in becoming a {type} partner with Admitra!

We have received your enquiry and our partnerships team will review your application.
You can expect to hear from us within 1-2 business days.

Here's what happens next:
1. Our team reviews your application
2. A B2B Sales representative will be assigned to your profile
3. They will contact you to discuss next steps

Best regards,
Admitra Team
```

---

### Email Template 13: Follow-Up Scheduled (to Lead)

**Subject:** `Follow-up Session Scheduled — {date} at {time}`
**Trigger:** `followUpController.createFollowUp`, `b2bFollowUpController.createB2BFollowUp`

```
Hi {leadName},

A follow-up session has been scheduled for you:

📋 Follow-up #: {followUpNumber}
👤 With: {counselorName}
📅 Date: {date}
🕐 Time: {time}
⏱ Duration: {duration} minutes
📍 Type: {meetingType}
{🔗 Join Link: {zohoMeetingUrl} (if online)}
{🔑 Meeting ID: {zohoMeetingId} | Password: {zohoMeetingPassword} (if online)}

{notes if present}

Best regards,
Admitra Team
```

---

### Email Template 14: Follow-Up Status Updated (to Lead)

**Subject:** `Follow-up #{followUpNumber} — Status: {statusLabel}`
**Trigger:** `followUpController.updateFollowUp`, `b2bFollowUpController.updateB2BFollowUp`

```
Hi {leadName},

There is an update on your follow-up session:

📋 Follow-up #: {followUpNumber}
👤 With: {counselorName}
📅 Date: {date}
📊 Status: {statusLabel}
{📝 Notes: {notes} (if present)}

If you have any questions, feel free to contact us.

Best regards,
Admitra Team
```

---

### Email Template 15: Team Meet Request (to Receiver)

**Subject:** `Meeting Request — "{subject}" on {date}`
**Trigger:** `teamMeetController.createTeamMeet`
**Note:** `sendMeetingPendingEmail` already exists in `utils/email.ts`. Verify it matches this format.

```
Hi {receiverName},

{senderName} has requested a meeting with you:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
⏱ Duration: {duration} minutes
📍 Type: {Online / In-Person}
{📎 Attachment: {attachmentName} (if any)}
{📝 Description: {description} (if any)}

Please log in to confirm or decline this meeting request:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

---

### Email Template 16: Team Meet Confirmed — Online (to Both Parties)

**Subject:** `Meeting Confirmed — "{subject}" on {date} | Zoho Details Inside`
**Trigger:** `teamMeetController.acceptTeamMeet` (Online)
**Note:** `sendMeetingConfirmedEmail` already exists. Verify it includes Zoho Meeting ID, Password, and Link.

```
Hi {participantName},

Your meeting has been confirmed:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
⏱ Duration: {duration} minutes
📍 Type: Online (Zoho Meeting)

🔗 Join Link: {zohoMeetingUrl}
🆔 Meeting ID: {zohoMeetingId}
🔑 Password: {zohoMeetingPassword}

Please join 2 minutes before the scheduled time.

Best regards,
Admitra Team
```

---

### Email Template 17: Team Meet Confirmed — In-Person (to Both Parties)

**Subject:** `Meeting Confirmed — "{subject}" on {date}`
**Trigger:** `teamMeetController.acceptTeamMeet` (In-Person / Face-to-Face)

```
Hi {participantName},

Your in-person meeting has been confirmed:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
⏱ Duration: {duration} minutes
📍 Type: In-Person

Please be on time for the meeting.

Best regards,
Admitra Team
```

---

### Email Template 18: Team Meet Rejected (to Sender)

**Subject:** `Meeting Request Declined — "{subject}"`
**Trigger:** `teamMeetController.rejectTeamMeet`

```
Hi {senderName},

Your meeting request has been declined by {receiverName}:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
❌ Reason: {rejectionMessage}

You can reschedule the meeting from your dashboard:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

---

### Email Template 19: Team Meet Cancelled (to Both Parties)

**Subject:** `Meeting Cancelled — "{subject}" on {date}`
**Trigger:** `teamMeetController.cancelTeamMeet`

```
Hi {participantName},

The following meeting has been cancelled:

📋 Subject: {subject}
📅 Date: {date}
🕐 Time: {time}
👤 Cancelled by: {senderName}

If you wish to reschedule, please log in:
https://core.admitra.io/dashboard

Best regards,
Admitra Team
```

---

### System Analysis — What Already Exists vs What Is New

| Notification | Current State | Action Needed |
|-------------|---------------|---------------|
| B2B enquiry email to enquirer | ✅ `sendB2BEnquiryConfirmationEmail` exists | Add WhatsApp (Template 13) |
| Lead enquiry email to enquirer | ❌ No welcome email to lead | Add email (Template 11) + WhatsApp (Template 12) |
| Referral enquiry email to enquirer | ❌ No welcome email to lead | Add email (Template 11) + WhatsApp (Template 12) |
| Follow-up created — email to lead | ✅ `sendMeetingScheduledEmail` to lead already in controller | Add WhatsApp (Template 14); verify email matches Template 13 |
| Follow-up status update — email | ❌ Not implemented | Add email (Template 14) + WhatsApp (Template 15) |
| Team meet created — email to receiver | ✅ `sendMeetingPendingEmail` exists | Add WhatsApp (Template 16); verify email matches Template 15 |
| Team meet confirmed — email to both | ✅ `sendMeetingConfirmedEmail` exists | Add WhatsApp (Template 17); verify Zoho ID/password/link are included in email |
| Team meet rejected — email to sender | ❌ Not implemented | Add email (Template 18) + WhatsApp (Template 18) |
| Team meet cancelled — email to both | ❌ Not implemented | Add email (Template 19) + WhatsApp (Template 19) |

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
