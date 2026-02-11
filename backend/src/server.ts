import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from "./routes/authRoutes";
import superAdminRoutes from "./routes/superAdminRoutes";
import adminRoutes from "./routes/adminRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import formAnswerRoutes from "./routes/formAnswerRoutes";
import studentRoutes from "./routes/studentRoutes";
import superAdminStudentRoutes from "./routes/superAdminStudentRoutes";
import adminStudentRoutes from "./routes/adminStudentRoutes";
import programRoutes from "./routes/programRoutes";
import chatRoutes from "./routes/chatRoutes";
import documentRoutes from "./routes/documentRoutes";
import coreDocumentRoutes from "./routes/coreDocumentRoutes";
import leadRoutes from "./routes/leadRoutes";
import followUpRoutes from "./routes/followUpRoutes";
import teamMeetRoutes from "./routes/teamMeetRoutes";
import opsScheduleRoutes from "./routes/opsScheduleRoutes";
import leadStudentConversionRoutes from "./routes/leadStudentConversionRoutes";

// Ivy League route imports
import ivyServiceRoutes from "./routes/ivyService.routes";
import ivyActivityRoutes from "./routes/activity.routes";
import ivyAdminRoutes from "./routes/admin.routes";
import ivyAgentSuggestionRoutes from "./routes/agentSuggestion.routes";
import ivyExcelUploadRoutes from "./routes/excelUpload.routes";
import ivyGrammarCheckRoutes from "./routes/grammarCheck.routes";
import ivyScoreRoutes from "./routes/ivyScore.routes";
import ivyNotificationRoutes from "./routes/notification.routes";
import ivyPointer1Routes from "./routes/pointer1.routes";
import ivyPointer234ActivityRoutes from "./routes/pointer234Activity.routes";
import ivyPointer5Routes from "./routes/pointer5.routes";
import ivyPointer6Routes from "./routes/pointer6.routes";
import ivyPointerActivityRoutes from "./routes/pointerActivity.routes";
import ivyStudentInterestRoutes from "./routes/studentInterest.routes";
import ivyTaskConversationRoutes from "./routes/taskConversation.routes";
import ivyUserRoutes from "./routes/user.routes";

import { authenticate } from "./middleware/auth";

// Import all models to register them with Mongoose
import "./models/User";
import "./models/Student";
import "./models/Ops";
import "./models/Admin";
import "./models/Counselor";
import "./models/Service";
import "./models/FormPart";
import "./models/ServiceFormPart";
import "./models/FormSection";
import "./models/FormSubSection";
import "./models/FormField";
import "./models/StudentServiceRegistration";
import "./models/StudentFormAnswer";
import "./models/Program";
import "./models/ProgramChat";
import "./models/ChatMessage";
import "./models/StudentDocument";
import "./models/COREDocumentField";
import "./models/Lead";
import "./models/FollowUp";
import "./models/TeamMeet";
import "./models/OpsSchedule";
import "./models/LeadStudentConversion";

// Import Ivy League models to register them with Mongoose
import "./models/ivy/AcademicData";
import "./models/ivy/AcademicDocument";
import "./models/ivy/AcademicEvaluation";
import "./models/ivy/Activity";
import "./models/ivy/AgentSuggestion";
import "./models/ivy/IvyExpertSelectedSuggestion";
import "./models/ivy/StudentSubmission";
import "./models/ivy/IvyExpertEvaluation";
import "./models/ivy/IvyExpertDocument";
import "./models/ivy/IvyPointer";
import "./models/ivy/EssayGuideline";
import "./models/ivy/EssaySubmission";
import "./models/ivy/EssayEvaluation";
import "./models/ivy/Pointer5Task";
import "./models/ivy/Pointer5Submission";
import "./models/ivy/Pointer5Evaluation";
import "./models/ivy/Pointer6CourseList";
import "./models/ivy/Pointer6Course";
import "./models/ivy/Pointer6SelectedCourse";
import "./models/ivy/Pointer6Certificate";
import "./models/ivy/Pointer6CertificateEvaluation";
import "./models/ivy/Pointer6Evaluation";
import "./models/ivy/StudentIvyScoreCard";
import "./models/ivy/StudentPointerScore";
import "./models/ivy/PointerNotification";
import "./models/ivy/TaskConversation";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve uploaded files statically
// Use getUploadBaseDir() for Vercel compatibility (/tmp/uploads on Vercel, ./uploads locally)
import { getUploadBaseDir } from './utils/uploadDir';
app.use('/uploads', express.static(getUploadBaseDir()));

app.use("/api/auth", authRoutes);
app.use("/api/super-admin/students", superAdminStudentRoutes); // More specific route must come first
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin/students", adminStudentRoutes); // Admin students routes (read-only)
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/forms", formAnswerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/core-documents", coreDocumentRoutes);
app.use("/api/follow-ups", followUpRoutes); // Follow-up routes
app.use("/api/team-meets", teamMeetRoutes); // TeamMeet routes
app.use("/api/ops-schedules", opsScheduleRoutes); // OPS Schedule routes
app.use("/api/lead-conversions", leadStudentConversionRoutes); // Lead to Student conversion routes
app.use("/api", leadRoutes); // Lead routes (includes public, admin, counselor endpoints)

// Ivy League routes (all protected by authenticate middleware)
app.use("/api/ivy/ivy-service", authenticate, ivyServiceRoutes);
app.use("/api/ivy/activities", authenticate, ivyActivityRoutes);
app.use("/api/ivy/admin", authenticate, ivyAdminRoutes);
app.use("/api/ivy/agent-suggestions", authenticate, ivyAgentSuggestionRoutes);
app.use("/api/ivy/excel-upload", authenticate, ivyExcelUploadRoutes);
app.use("/api/ivy/grammar-check", authenticate, ivyGrammarCheckRoutes);
app.use("/api/ivy/ivy-score", authenticate, ivyScoreRoutes);
app.use("/api/ivy/notifications", authenticate, ivyNotificationRoutes);
app.use("/api/ivy/pointer1", authenticate, ivyPointer1Routes);
app.use("/api/ivy/pointer234", authenticate, ivyPointer234ActivityRoutes);
app.use("/api/ivy/pointer5", authenticate, ivyPointer5Routes);
app.use("/api/ivy/pointer6", authenticate, ivyPointer6Routes);
app.use("/api/ivy/pointer/activity", authenticate, ivyPointerActivityRoutes);
app.use("/api/ivy/student-interest", authenticate, ivyStudentInterestRoutes);
app.use("/api/ivy/task", authenticate, ivyTaskConversationRoutes);
app.use("/api/ivy/users", authenticate, ivyUserRoutes);

// Basic test route
app.get('/', (_req, res) => {
  res.send('API is running!');
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      // These options work well for both local and Atlas MongoDB
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

export default app;

