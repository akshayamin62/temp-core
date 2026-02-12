# 🎓 Kareer Studio - Integrated Platform

> A comprehensive student services management platform that handles Study Abroad applications, Ivy League preparation, Education Planning, and more - with role-based access for Students, Parents, OPS staff, Counselors, Admins, Super Admins, and Ivy Experts.

---

## 📸 Banner

To add a banner image, place a `.png` file at `public/banner.png` (1920x400px recommended), and uncomment the line below:

```markdown
![Kareer Studio Banner](public/banner.png)
```

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Services](#services)
- [Core Features](#core-features)
- [API Routes](#api-routes)
- [Database Models](#database-models)
- [File Upload Specifications](#file-upload-specifications)
- [Environment Setup](#environment-setup)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)
- [License](#license)

---

## ✨ Features

### 🔐 Secure Authentication & Authorization
- JWT-based authentication with email verification and password reset
- Role-based middleware with granular access control
- Protected routes and API endpoints per user role

### 📝 Dynamic Form System
- Configurable form parts, sections, sub-sections, and fields
- Multiple field types: text, number, date, select, file, multi-select, email, phone, and more
- Per-student form answers with real-time progress tracking
- Conditional field visibility and validation

### 🌍 Study Abroad Module
- Comprehensive program management (university, campus, country, intake, priority)
- Real-time chat between Students, OPS, Admins, Super Admins, and Counselors
- Open and private chat channels per program
- Organized document management for student and CORE documents
- Application status tracking and timeline management

### 🏆 Ivy League Preparation (6-Pointer System)
- **Pointer 1**: Academic data evaluation with document uploads
- **Pointer 2/3/4**: Extracurricular activities with AI-powered suggestions, grammar check, and expert evaluation
- **Pointer 5**: Essay writing with guidelines, drafts, feedback, and professional evaluation
- **Pointer 6**: Online course tracking with certificates and performance scoring
- **Ivy Score Card**: Aggregated performance across all pointers
- **Task Conversations**: Real-time collaboration between students and Ivy Experts
- Real-time notifications for pointer updates and deadlines

### 📚 Education Planning
- Guided education planning with EduPlan coaches
- IELTS coaching and test preparation support

### 💼 CRM & Lead Management
- Lead capture and follow-up scheduling
- Team meets scheduling and calendar management
- OPS schedule calendar with task assignments
- Lead-to-student conversion workflow

### 🎯 Admin Dashboard
- Comprehensive student management
- OPS and Counselor assignment management
- Service and form configuration
- Activity logs and system overview
- User role management and permissions

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 16.1.1 |
| | React | 19.2.3 |
| | TypeScript | Latest |
| | Tailwind CSS | 4 |
| **Backend** | Node.js | 18+ |
| | Express | 5 |
| | TypeScript | Latest |
| | Mongoose | 8 |
| **Database** | MongoDB | 6+ |
| **Authentication** | JWT | - |
| | bcryptjs | For password hashing |
| **File Handling** | Multer | For file uploads |
| | pdf-parse | PDF parsing |
| | mammoth | Word document parsing |
| | xlsx | Excel file parsing |
| **Email** | Nodemailer | For notifications |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── server.ts                 # Express server entry point
│   │   ├── controllers/              # Request handlers
│   │   ├── middleware/               # auth, authorize, upload, validate
│   │   ├── models/                   # Mongoose schemas (core + ivy/)
│   │   ├── routes/                   # API route definitions
│   │   ├── services/                 # Business logic layer
│   │   ├── scripts/                  # Database seeding
│   │   ├── types/                    # TypeScript interfaces
│   │   └── utils/                    # Utility functions
│   ├── uploads/                      # User-uploaded files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                          # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js pages (file-based routing)
│   │   ├── components/               # Reusable React components
│   │   ├── config/                   # Configuration files
│   │   ├── contexts/                 # React Context
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # API client & utilities
│   │   ├── types/                    # TypeScript interfaces
│   │   └── utils/                    # Utility functions
│   ├── public/                       # Static files & banner images
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── .env.local                    # Frontend environment variables
│
└── README.md                         # This file
```

---

## 👥 User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Student** | Primary platform users | Register for services, fill forms, upload documents, chat with OPS, track Ivy League progress |
| **Parent** | Student guardians | Read-only access to child's progress and Ivy League activities |
| **OPS** | Operations staff | Manage assigned students, chat, review applications, schedule follow-ups |
| **Counselor** | Academic advisors | Read-only access to assigned students and registrations |
| **Admin** | Platform administrators | Manage students, assign OPS/Counselors, configure services and forms |
| **Super Admin** | System administrators | Full system access - manage all users, services, configurations, leads |
| **Ivy Expert** | Subject matter experts | Evaluate Ivy League pointer activities, essays, and provide feedback |

---

## 🎯 Services

### 1. **Study Abroad** 
University applications with dynamic multi-part forms, program tracking, and collaborative chat

### 2. **Ivy League Preparation**
6-pointer evaluation system with activities, essays, academic data, course lists, and comprehensive scoring

### 3. **Education Planning**
Guided planning sessions with EduPlan coaches

### 4. **IELTS Coaching**
Test preparation and coaching services

---

## 🔧 Core Features

### Authentication & Authorization
- ✅ JWT-based authentication with email verification
- ✅ Secure password reset flow
- ✅ Role-based access control (RBAC)
- ✅ Protected API endpoints
- ✅ Session management

### Dynamic Form System
- ✅ Customizable form structures
- ✅ Multiple field types with validation
- ✅ Conditional field visibility
- ✅ Real-time progress tracking
- ✅ Form versioning support

### Document Management
- ✅ PDF, Word, Excel, and image uploads
- ✅ File validation and virus scanning ready
- ✅ Organized file storage with user isolation
- ✅ Download and preview capabilities

### Real-time Communication
- ✅ Program-specific chat channels
- ✅ Private and open chat modes
- ✅ Message notifications
- ✅ File sharing in conversations
- ✅ Message history and search

### Ivy League Workflow
- ✅ Multi-pointer evaluation system
- ✅ AI-powered activity suggestions
- ✅ Grammar and plagiarism checking
- ✅ Real-time task conversations
- ✅ Performance scoring and leaderboards
- ✅ Progress notifications

---

## 🌐 API Routes

### Core Routes

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/auth` | Authentication | Login, signup, verify email, password reset |
| `/api/super-admin` | Super Admin | System-level operations and management |
| `/api/admin` | Admin | User and service management |
| `/api/student` | Student | Student profile and service registration |
| `/api/services` | Services | Service CRUD operations |
| `/api/forms` | Forms | Form submission and management |
| `/api/programs` | Programs | Study abroad program management |
| `/api/chat` | Chat | Program-based messaging (open + private) |
| `/api/documents` | Documents | Student document uploads and management |
| `/api/core-documents` | CORE Docs | CORE document field management |
| `/api/follow-ups` | Follow-ups | Follow-up scheduling and tracking |
| `/api/team-meets` | Team Meets | Team meeting organization |
| `/api/ops-schedules` | OPS Schedule | OPS task calendar management |
| `/api/lead-conversions` | Lead Conv | Lead to student conversion |
| `/api/leads` | Leads | Lead management and CRM |

### Ivy League Routes (all under `/api/ivy/`)

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/ivy/ivy-service` | Ivy Service | Student registration and profile |
| `/api/ivy/pointer1` | Pointer 1 | Academic data and evaluation |
| `/api/ivy/pointer234` | Pointers 2/3/4 | Activity management and evaluation |
| `/api/ivy/pointer5` | Pointer 5 | Essay tasks and evaluation |
| `/api/ivy/pointer6` | Pointer 6 | Course and certificate management |
| `/api/ivy/pointer/activity` | General Activity | Common activity operations |
| `/api/ivy/agent-suggestions` | AI Suggestions | Agent-powered activity recommendations |
| `/api/ivy/grammar-check` | Grammar | Grammar and plagiarism checking |
| `/api/ivy/ivy-score` | Scoring | Ivy score card and aggregation |
| `/api/ivy/admin` | Ivy Admin | Ivy League administration |
| `/api/ivy/excel-upload` | Excel Upload | Bulk data imports |
| `/api/ivy/notifications` | Notifications | Pointer update notifications |
| `/api/ivy/student-interest` | Interests | Student interest profiles |
| `/api/ivy/task` | Task Conv | Task conversations and messaging |
| `/api/ivy/users` | Users | Ivy user management |

---

## 💾 Database Models

### Core Models
```
User, Student, Admin, Ops, Counselor, IvyExpert, EduplanCoach
Service, FormPart, ServiceFormPart, FormSection, FormSubSection, FormField
StudentServiceRegistration, StudentFormAnswer
Program, ProgramChat, ChatMessage
StudentDocument, COREDocumentField
Lead, LeadStudentConversion
FollowUp, TeamMeet, OpsSchedule
```

### Ivy League Models
```
AcademicData, AcademicDocument, AcademicEvaluation
Activity, AgentSuggestion, IvyExpertSelectedSuggestion
StudentSubmission, IvyExpertEvaluation, IvyExpertDocument
IvyPointer, EssayGuideline, EssaySubmission, EssayEvaluation
Pointer5Task, Pointer5Submission, Pointer5Evaluation
Pointer6CourseList, Pointer6Course, Pointer6SelectedCourse
Pointer6Certificate, Pointer6CertificateEvaluation, Pointer6Evaluation
StudentIvyScoreCard, StudentPointerScore
PointerNotification, TaskConversation
```

---

## 📸 File Upload Specifications

### Banner Image Upload
- **Format**: `.png` (PNG format only)
- **Max Size**: 5 MB
- **Recommended Dimensions**: 1920 x 400 pixels (or 16:4 aspect ratio)
- **Location**: `frontend/public/banner.png`
- **Use Case**: Homepage hero banner and promotional materials

### Supported Document Uploads
| File Type | Extensions | Max Size | Use Case |
|-----------|-----------|----------|----------|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | 10 MB | Certificates, IDs, proofs |
| PDFs | `.pdf` | 20 MB | Documents, essays, reports |
| Word Docs | `.doc`, `.docx` | 15 MB | Essays, assignments |
| Spreadsheets | `.xls`, `.xlsx` | 10 MB | Course lists, academic data |
| Videos | `.mp4`, `.webm`, `.mov` | 100 MB | Activity recordings, demos |

### File Upload Directory Structure
```
backend/uploads/
├── {userId}/                 # User-specific uploads
├── activities/               # Activity proofs
├── admin/                    # Admin uploads
├── pointer1/                 # Pointer 1 documents
├── pointer5/                 # Pointer 5 essays
├── task-conversations/       # Chat attachments
└── certificates/             # Course certificates
```

---

## 🔐 Environment Setup

### Backend `.env`
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/kareer-studio

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_ADDRESS=noreply@kareerstudio.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# URLs
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
PASSWORD_RESET_URL=http://localhost:3000/reset-password
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Kareer Studio
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **MongoDB** v6.0 or higher
- **Git** for version control

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Seed initial data
npm run seed:forms       # Seed form configurations
npm run seed:documents   # Seed CORE document fields

# Create database indexes
npm run create:indexes

# Start development server
npm run dev              # Runs on http://localhost:5000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev              # Runs on http://localhost:3000
```

### Verify Installation
- Backend API: http://localhost:5000/api (should return API info)
- Frontend: http://localhost:3000 (should load the login page)
- Database: Connected MongoDB instance

---

## 🏗️ Build & Deployment

### Backend Build
```bash
cd backend

# Build TypeScript to JavaScript
npm run build

# Output: dist/ directory contains compiled code

# Start production server
npm start
```

### Frontend Build
```bash
cd frontend

# Build Next.js for production
npm run build

# Start production server
npm start
```

### Docker Deployment (Optional)
```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 📝 Scripts Reference

### Backend Scripts
```bash
npm run dev                 # Start dev server with nodemon
npm run build               # Compile TypeScript
npm start                   # Run production build
npm run seed:forms          # Seed form data
npm run seed:documents      # Seed CORE documents
npm run create:indexes      # Create MongoDB indexes
npm run lint                # Run ESLint (if configured)
npm run type-check          # Run TypeScript compiler check
```

### Frontend Scripts
```bash
npm run dev                 # Start Next.js dev server
npm run build               # Build for production
npm start                   # Start production server
npm run lint                # Run ESLint
```

---

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 📞 Support

For support, email support@kareerstudio.com or open an issue in the repository.

---

**Last Updated**: February 2026  
**Version**: 1.0.0  
**Status**: Production Ready
#   t e m p - c o r e 
 
 