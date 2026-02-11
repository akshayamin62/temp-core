"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const superAdminRoutes_1 = __importDefault(require("./routes/superAdminRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const formAnswerRoutes_1 = __importDefault(require("./routes/formAnswerRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const superAdminStudentRoutes_1 = __importDefault(require("./routes/superAdminStudentRoutes"));
const adminStudentRoutes_1 = __importDefault(require("./routes/adminStudentRoutes"));
const programRoutes_1 = __importDefault(require("./routes/programRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const coreDocumentRoutes_1 = __importDefault(require("./routes/coreDocumentRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const followUpRoutes_1 = __importDefault(require("./routes/followUpRoutes"));
const teamMeetRoutes_1 = __importDefault(require("./routes/teamMeetRoutes"));
const opsScheduleRoutes_1 = __importDefault(require("./routes/opsScheduleRoutes"));
const leadStudentConversionRoutes_1 = __importDefault(require("./routes/leadStudentConversionRoutes"));
// Ivy League route imports
const ivyService_routes_1 = __importDefault(require("./routes/ivyService.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const agentSuggestion_routes_1 = __importDefault(require("./routes/agentSuggestion.routes"));
const excelUpload_routes_1 = __importDefault(require("./routes/excelUpload.routes"));
const grammarCheck_routes_1 = __importDefault(require("./routes/grammarCheck.routes"));
const ivyScore_routes_1 = __importDefault(require("./routes/ivyScore.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const pointer1_routes_1 = __importDefault(require("./routes/pointer1.routes"));
const pointer234Activity_routes_1 = __importDefault(require("./routes/pointer234Activity.routes"));
const pointer5_routes_1 = __importDefault(require("./routes/pointer5.routes"));
const pointer6_routes_1 = __importDefault(require("./routes/pointer6.routes"));
const pointerActivity_routes_1 = __importDefault(require("./routes/pointerActivity.routes"));
const studentInterest_routes_1 = __importDefault(require("./routes/studentInterest.routes"));
const taskConversation_routes_1 = __importDefault(require("./routes/taskConversation.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_1 = require("./middleware/auth");
// Import all models to register them with Mongoose
require("./models/User");
require("./models/Student");
require("./models/Ops");
require("./models/Admin");
require("./models/Counselor");
require("./models/Service");
require("./models/FormPart");
require("./models/ServiceFormPart");
require("./models/FormSection");
require("./models/FormSubSection");
require("./models/FormField");
require("./models/StudentServiceRegistration");
require("./models/StudentFormAnswer");
require("./models/Program");
require("./models/ProgramChat");
require("./models/ChatMessage");
require("./models/StudentDocument");
require("./models/COREDocumentField");
require("./models/Lead");
require("./models/FollowUp");
require("./models/TeamMeet");
require("./models/OpsSchedule");
require("./models/LeadStudentConversion");
// Import Ivy League models to register them with Mongoose
require("./models/ivy/AcademicData");
require("./models/ivy/AcademicDocument");
require("./models/ivy/AcademicEvaluation");
require("./models/ivy/Activity");
require("./models/ivy/AgentSuggestion");
require("./models/ivy/IvyExpertSelectedSuggestion");
require("./models/ivy/StudentSubmission");
require("./models/ivy/IvyExpertEvaluation");
require("./models/ivy/IvyExpertDocument");
require("./models/ivy/IvyPointer");
require("./models/ivy/EssayGuideline");
require("./models/ivy/EssaySubmission");
require("./models/ivy/EssayEvaluation");
require("./models/ivy/Pointer5Task");
require("./models/ivy/Pointer5Submission");
require("./models/ivy/Pointer5Evaluation");
require("./models/ivy/Pointer6CourseList");
require("./models/ivy/Pointer6Course");
require("./models/ivy/Pointer6SelectedCourse");
require("./models/ivy/Pointer6Certificate");
require("./models/ivy/Pointer6CertificateEvaluation");
require("./models/ivy/Pointer6Evaluation");
require("./models/ivy/StudentIvyScoreCard");
require("./models/ivy/StudentPointerScore");
require("./models/ivy/PointerNotification");
require("./models/ivy/TaskConversation");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // Parse JSON bodies
app.use(express_1.default.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Serve uploaded files statically
// Use getUploadBaseDir() for Vercel compatibility (/tmp/uploads on Vercel, ./uploads locally)
const uploadDir_1 = require("./utils/uploadDir");
app.use('/uploads', express_1.default.static((0, uploadDir_1.getUploadBaseDir)()));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/super-admin/students", superAdminStudentRoutes_1.default); // More specific route must come first
app.use("/api/super-admin", superAdminRoutes_1.default);
app.use("/api/admin/students", adminStudentRoutes_1.default); // Admin students routes (read-only)
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/services", serviceRoutes_1.default);
app.use("/api/forms", formAnswerRoutes_1.default);
app.use("/api/student", studentRoutes_1.default);
app.use("/api/programs", programRoutes_1.default);
app.use("/api/chat", chatRoutes_1.default);
app.use("/api/documents", documentRoutes_1.default);
app.use("/api/core-documents", coreDocumentRoutes_1.default);
app.use("/api/follow-ups", followUpRoutes_1.default); // Follow-up routes
app.use("/api/team-meets", teamMeetRoutes_1.default); // TeamMeet routes
app.use("/api/ops-schedules", opsScheduleRoutes_1.default); // OPS Schedule routes
app.use("/api/lead-conversions", leadStudentConversionRoutes_1.default); // Lead to Student conversion routes
app.use("/api", leadRoutes_1.default); // Lead routes (includes public, admin, counselor endpoints)
// Ivy League routes (all protected by authenticate middleware)
app.use("/api/ivy/ivy-service", auth_1.authenticate, ivyService_routes_1.default);
app.use("/api/ivy/activities", auth_1.authenticate, activity_routes_1.default);
app.use("/api/ivy/admin", auth_1.authenticate, admin_routes_1.default);
app.use("/api/ivy/agent-suggestions", auth_1.authenticate, agentSuggestion_routes_1.default);
app.use("/api/ivy/excel-upload", auth_1.authenticate, excelUpload_routes_1.default);
app.use("/api/ivy/grammar-check", auth_1.authenticate, grammarCheck_routes_1.default);
app.use("/api/ivy/ivy-score", auth_1.authenticate, ivyScore_routes_1.default);
app.use("/api/ivy/notifications", auth_1.authenticate, notification_routes_1.default);
app.use("/api/ivy/pointer1", auth_1.authenticate, pointer1_routes_1.default);
app.use("/api/ivy/pointer234", auth_1.authenticate, pointer234Activity_routes_1.default);
app.use("/api/ivy/pointer5", auth_1.authenticate, pointer5_routes_1.default);
app.use("/api/ivy/pointer6", auth_1.authenticate, pointer6_routes_1.default);
app.use("/api/ivy/pointer/activity", auth_1.authenticate, pointerActivity_routes_1.default);
app.use("/api/ivy/student-interest", auth_1.authenticate, studentInterest_routes_1.default);
app.use("/api/ivy/task", auth_1.authenticate, taskConversation_routes_1.default);
app.use("/api/ivy/users", auth_1.authenticate, user_routes_1.default);
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
        await mongoose_1.default.connect(process.env.MONGO_URI, {
            // These options work well for both local and Atlas MongoDB
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        });
        console.log('✅ Connected to MongoDB successfully');
        console.log(`📊 Database: ${mongoose_1.default.connection.name}`);
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map