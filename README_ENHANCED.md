# Kareer Studio - Integrated Student Services Platform

A comprehensive, full-stack student services management platform designed to streamline Study Abroad applications, Ivy League preparation, Education Planning, and lead management with enterprise-grade role-based access control.

---

## 🚀 Quick Overview

**Kareer Studio** is an all-in-one platform serving multiple user roles including Students, Parents, OPS staff, Counselors, Admins, Super Admins, and Ivy League Experts. It combines application management, expert evaluation, document handling, and real-time collaboration in a seamless, intuitive interface.

---

## 📚 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Core Services](#core-services)
- [Key Features](#key-features)
- [API Routes](#api-routes)
- [Database Models](#database-models)
- [Environment Setup](#environment-setup)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS | 16.1.1, 19.2.3, Latest, 4.x |
| **Backend** | Node.js, Express, TypeScript | LTS, 5.x, Latest |
| **Database** | MongoDB, Mongoose | Atlas, 8.x |
| **Authentication** | JWT, bcrypt | Standard, Latest |
| **File Management** | Multer | Latest |
| **Email Service** | Nodemailer | Latest |
| **Document Parsing** | pdf-parse, mammoth, xlsx | Latest |

---

## 📁 Project Structure

```
kareer-studio/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Express app entry point
│   │   ├── controllers/                 # Request handlers (50+ files)
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # JWT authentication
│   │   │   ├── authorize.ts            # Role-based authorization
│   │   │   ├── upload.ts               # File upload handling
│   │   │   └── validate.ts             # Request validation
│   │   ├── models/                     # Mongoose schemas
│   │   │   ├── User.ts, Student.ts, Admin.ts, etc.
│   │   │   └── ivy/                    # Ivy League specific models
│   │   ├── routes/                     # Express route definitions
│   │   ├── services/                   # Business logic layer
│   │   ├── scripts/                    # Utility scripts (seeding, indexing)
│   │   ├── types/                      # TypeScript interfaces & enums
│   │   └── utils/                      # Helper functions
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                        # Next.js file-based routing
│   │   │   ├── auth/                   # Auth pages
│   │   │   ├── admin/                  # Admin dashboard
│   │   │   ├── super-admin/            # Super admin portal
│   │   │   ├── ivy-league/             # Ivy League pages
│   │   │   ├── student/                # Student pages
│   │   │   ├── ops/                    # OPS staff pages
│   │   │   └── counselor/              # Counselor pages
│   │   ├── components/                 # Reusable React components
│   │   ├── config/                     # Configuration files
│   │   ├── lib/                        # API client and utilities
│   │   ├── types/                      # TypeScript interfaces
│   │   └── utils/                      # Helper functions
│   ├── public/                         # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── README.md
├── ENVIRONMENT_SETUP.md
├── DEPLOYMENT_GUIDE_VERCEL.md
├── DEPLOYMENT_GUIDE_HOSTINGER.md
├── DOMAIN_SETUP.md
├── SYSTEM_WORKFLOW.md
└── PROJECT_DOCUMENTATION.md
```

---

## 👥 User Roles & Permissions

| Role | Key Responsibilities | Access Level |
|------|---------------------|--------------|
| **Student** | Register for services, fill forms, upload documents, chat with OPS, complete Ivy League assessments | Limited to own data |
| **Parent** | View assigned child's progress and Ivy League pointer activities | Read-only, specific child |
| **OPS Staff** | Manage assigned students, conduct follow-ups, review applications, open chat with students | Assigned students only |
| **Counselor** | Access and review assigned student data and registrations | Read-only, assigned students |
| **Admin** | Manage students, assign OPS/Counselors, manage services and forms | Organization-wide |
| **Super Admin** | Full system access - manage admins, OPS, counselors, services, leads, Ivy Experts | Complete system |
| **Ivy Expert** | Evaluate Ivy League pointer activities, essays, and provide feedback | Assigned students' work |

---

## 🎯 Core Services

### 1. **Study Abroad** 📋
   - Multi-stage university application management
   - Dynamic program selection with university, campus, and intake filters
   - Document upload and management (student docs + CORE docs)
   - Real-time chat (open & private) between students and OPS
   - Application status tracking

### 2. **Ivy League Preparation** 🎓
   - **6-Pointer Evaluation System:**
     - **Pointer 1**: Academic Data - subject scores, weightages, documents
     - **Pointer 2/3/4**: Extracurricular Activities - agent suggestions, submissions, evaluations
     - **Pointer 5**: Essay Writing - guidelines, drafts, revisions, feedback
     - **Pointer 6**: Online Courses - course lists, certificates, scoring
   - Integrated Ivy Score Card with aggregated pointer scores
   - Task conversations with structured feedback (feedback, action, resource types)
   - Real-time notifications for pointer updates

### 3. **Education Planning** 🗺️
   - Guided education planning services
   - EduPlan coaches assignment
   - Student progress tracking

### 4. **IELTS Coaching** 🎤
   - Test preparation service management
   - Coaching material distribution
   - Progress monitoring

### 5. **CRM & Lead Management** 📞
   - Lead capture and qualification
   - Automated follow-up scheduling
   - Team meets management
   - Lead-to-student conversion workflow
   - OPS schedule calendar

---

## ⚡ Key Features

### Authentication & Authorization
- ✅ JWT-based authentication with secure token management
- ✅ Email verification and password reset workflows
- ✅ Role-based middleware for granular access control
- ✅ Protected routes with authorization checks

### Dynamic Form System
- ✅ Configurable form parts, sections, and subsections
- ✅ Rich field types: text, number, date, select, file, multi-select, checkbox, textarea
- ✅ Per-student form answer tracking with progress indicators
- ✅ Service-specific form configurations
- ✅ Form submission validation and versioning

### Document Management
- ✅ Student document uploads with file validation
- ✅ CORE document field management for study abroad
- ✅ Document categorization and versioning
- ✅ Secure file storage and blob URL generation

### Real-Time Communication
- ✅ Program-based open chat (accessible to Student, OPS, Admin, Super Admin)
- ✅ Private chats between OPS and students
- ✅ Task conversation threads with structured message types
- ✅ Structured feedback system (feedback, action, resource, general messages)
- ✅ File attachment support in all chat types

### Ivy League Evaluation
- ✅ Multi-stage pointer evaluation workflow
- ✅ Ivy Expert scoring and feedback
- ✅ Grammar checking integration for essays
- ✅ AI-powered activity suggestions based on student interest
- ✅ Aggregate score calculations and rankings

### Admin & Super Admin Dashboards
- ✅ Student lifecycle management
- ✅ Service and form configuration
- ✅ Role assignment (OPS, Counselors, Ivy Experts)
- ✅ Lead and follow-up management
- ✅ Activity logging and audit trails
- ✅ System health and usage analytics

---

## 🔌 API Routes

### Authentication Routes (`/api/auth`)
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Complete password reset

### Core Entity Routes
| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/super-admin` | Super Admin | System-wide administration |
| `/api/admin` | Admin | Organization administration |
| `/api/student` | Students | Student operations |
| `/api/services` | Services | Service CRUD operations |
| `/api/forms` | Forms | Form and form answer management |
| `/api/programs` | Programs | Study abroad program management |

### Communication Routes
| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/chat` | Chat | Program chat (open + private) |
| `/api/documents` | Documents | Student document uploads |
| `/api/core-documents` | CORE Documents | Study abroad document fields |

### Workflow Routes
| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/follow-ups` | Follow-ups | Follow-up scheduling |
| `/api/team-meets` | Team Meets | Team meeting management |
| `/api/ops-schedules` | OPS Schedules | OPS availability calendar |
| `/api/leads` | Leads | Lead management |
| `/api/lead-conversions` | Lead Conversions | Lead to student conversion |

### Ivy League Routes (all under `/api/ivy/`)
| Prefix | Purpose |
|--------|---------|
| `/api/ivy/ivy-service` | Student Ivy service registration and management |
| `/api/ivy/pointer1` | Academic data, documents, and evaluation |
| `/api/ivy/pointer234` | Activity suggestions, submissions, and evaluation |
| `/api/ivy/pointer5` | Essay guidelines, tasks, submissions, and evaluation |
| `/api/ivy/pointer6` | Course lists, certificates, and certificate evaluation |
| `/api/ivy/pointer/activity` | General pointer activity management |
| `/api/ivy/task/conversation` | Task-based conversations between students and Ivy Experts |
| `/api/ivy/agent-suggestions` | AI-generated activity suggestions |
| `/api/ivy/grammar-check` | Grammar checking for essays |
| `/api/ivy/ivy-score` | Ivy score card and pointer scores |
| `/api/ivy/notifications` | Pointer update notifications |
| `/api/ivy/student-interest` | Student interest profiles |
| `/api/ivy/users` | Ivy user management |
| `/api/ivy/admin` | Ivy admin operations |
| `/api/ivy/excel-upload` | Bulk uploads from Excel |

---

## 💾 Database Models

### Core Models (20+ models)
- **User Management**: User, Student, Admin, Ops, Counselor, IvyExpert, EduplanCoach
- **Service Management**: Service, FormPart, ServiceFormPart, FormSection, FormSubSection, FormField
- **Student Data**: StudentServiceRegistration, StudentFormAnswer, StudentDocument
- **Study Abroad**: Program, ProgramChat, ChatMessage, COREDocumentField

### CRM Models
- **Lead Management**: Lead, LeadStudentConversion, FollowUp
- **Team Operations**: TeamMeet, OpsSchedule

### Ivy League Models (30+ models in `/models/ivy/`)
- **Academic**: AcademicData, AcademicDocument, AcademicEvaluation
- **Activities**: Activity, AgentSuggestion, IvyExpertSelectedSuggestion, StudentSubmission, IvyExpertEvaluation, IvyExpertDocument
- **Essays**: EssayGuideline, EssaySubmission, EssayEvaluation, Pointer5Task, Pointer5Submission, Pointer5Evaluation
- **Courses**: Pointer6CourseList, Pointer6Course, Pointer6SelectedCourse, Pointer6Certificate, Pointer6CertificateEvaluation, Pointer6Evaluation
- **Scoring**: StudentIvyScoreCard, StudentPointerScore, IvyPointer
- **Communication**: TaskConversation, PointerNotification

---

## 🔧 Environment Setup

### Backend Configuration (`.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email Service
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
PASSWORD_RESET_URL=http://localhost:3000/reset-password

# File Uploads
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads

# External Services
GRAMMAR_CHECK_API_KEY=optional-api-key
```

### Frontend Configuration (`.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Build-time variables
NEXT_PUBLIC_APP_NAME=Kareer Studio
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ or 20+
- **npm** or **yarn** package manager
- **MongoDB** 5.0+ (local or Atlas)
- **Git**

### Installation

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Seed initial data
npm run seed:forms       # Initialize form structures
npm run seed:documents   # Seed CORE document fields

# Create database indexes for performance
npm run create:indexes

# Start development server
npm run dev              # Runs on http://localhost:5000
```

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev              # Runs on http://localhost:3000
```

#### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Documentation**: http://localhost:5000/api-docs (if available)

---

## 🏗️ Build & Deployment

### Production Build

#### Backend
```bash
cd backend

# Compile TypeScript to JavaScript
npm run build

# Verify build
npm run build:check

# Start production server
npm start
```

#### Frontend
```bash
cd frontend

# Create production build
npm run build

# Test production build locally
npm start

# Generate static export (optional)
npm run export
```

### Deployment Options

#### Option 1: Vercel (Frontend)
```bash
# Deploy Next.js frontend
npm install -g vercel
vercel --prod
```
See [DEPLOYMENT_GUIDE_VERCEL.md](./DEPLOYMENT_GUIDE_VERCEL.md) for detailed instructions.

#### Option 2: Hostinger (Full Stack)
See [DEPLOYMENT_GUIDE_HOSTINGER.md](./DEPLOYMENT_GUIDE_HOSTINGER.md) for complete setup instructions.

#### Option 3: Docker
```bash
# Build Docker image
docker build -t kareer-studio-backend ./backend
docker build -t kareer-studio-frontend ./frontend

# Run containers
docker run -p 5000:5000 kareer-studio-backend
docker run -p 3000:3000 kareer-studio-frontend
```

### Domain & SSL Setup
See [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) for domain configuration and SSL certificate setup.

---

## 📖 Additional Documentation

- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Detailed environment configuration
- **[SYSTEM_WORKFLOW.md](./SYSTEM_WORKFLOW.md)** - Complete system workflows and data flows
- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Comprehensive feature documentation
- **[DEPLOYMENT_GUIDE_VERCEL.md](./DEPLOYMENT_GUIDE_VERCEL.md)** - Vercel deployment guide
- **[DEPLOYMENT_GUIDE_HOSTINGER.md](./DEPLOYMENT_GUIDE_HOSTINGER.md)** - Hostinger deployment guide
- **[DOMAIN_SETUP.md](./DOMAIN_SETUP.md)** - Domain and SSL configuration

---

## 🔐 Security Best Practices

- ✅ All passwords hashed with bcrypt (10 salt rounds)
- ✅ JWT tokens with expiration (default 7 days)
- ✅ HTTPS enforced in production
- ✅ Role-based access control on all protected routes
- ✅ File upload validation and size limits
- ✅ SQL injection and XSS protection via Mongoose and sanitization
- ✅ Rate limiting on auth endpoints (recommended)
- ✅ Environment variables for sensitive data
- ✅ CORS configured for frontend origin only

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:e2e         # End-to-end tests
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Verify connection string in .env
# Check MongoDB Atlas IP whitelist includes your IP
# Test connection: mongo <MONGO_URI>
```

### Port Already in Use
```bash
# Backend (Port 5000)
lsof -i :5000
kill -9 <PID>

# Frontend (Port 3000)
lsof -i :3000
kill -9 <PID>
```

### TypeScript Errors
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages (Auth, Admin, Super Admin, Ivy League, etc)   │   │
│  │  Components (Forms, Chat, Activities, Dashboards)    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend (Express.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes → Controllers → Services → Models            │   │
│  │  Auth Middleware → Authorization Middleware          │   │
│  │  Error Handling → Request Validation                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ MongoDB Driver
┌──────────────────────▼──────────────────────────────────────┐
│              MongoDB (Mongoose)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core Models | Ivy League Models | CRM Models        │   │
│  │  Indexes | Aggregations | Transactions               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration followed
- Prettier formatting applied
- Meaningful commit messages
- Tests written for new features

---

## 📄 License

ISC License - See LICENSE file for details.

---

## 🤝 Support & Contact

For issues, questions, or feature requests:
- Create an issue in the repository
- Contact: support@kareerstudio.com
- Documentation: [Project Documentation](./PROJECT_DOCUMENTATION.md)

---

## 🎉 Acknowledgments

Built with modern technologies to provide a seamless student services management experience. Special thanks to all contributors and the open-source community.

---

**Last Updated**: February 2026 | **Version**: 1.0.0
