"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const adminStudentController_1 = require("../controllers/adminStudentController");
const router = express_1.default.Router();
// All routes require authentication and admin/counselor/super-admin role
router.use(auth_1.authenticate);
router.use((0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.SUPER_ADMIN]));
// Get all students under this admin
router.get('/', adminStudentController_1.getAdminStudents);
// Get student by lead ID (for converted leads)
router.get('/by-lead/:leadId', adminStudentController_1.getStudentByLeadId);
// Get student details
router.get('/:studentId', adminStudentController_1.getAdminStudentDetails);
// Get student form answers for a registration (read-only)
router.get('/:studentId/registrations/:registrationId/answers', adminStudentController_1.getAdminStudentFormAnswers);
exports.default = router;
//# sourceMappingURL=adminStudentRoutes.js.map