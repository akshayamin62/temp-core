"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const superAdminStudentController_1 = require("../controllers/superAdminStudentController");
const router = express_1.default.Router();
// All routes require authentication and super admin/ops role
router.use(auth_1.authenticate);
router.use((0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.OPS]));
// Get all students
router.get('/', superAdminStudentController_1.getAllStudents);
// Get students with registrations (for filtering)
router.get('/with-registrations', superAdminStudentController_1.getStudentsWithRegistrations);
// Get student details
router.get('/:studentId', superAdminStudentController_1.getStudentDetails);
// Get student form answers for a registration
router.get('/:studentId/registrations/:registrationId/answers', superAdminStudentController_1.getStudentFormAnswers);
// Update student form answers
router.put('/:studentId/answers/:partKey', superAdminStudentController_1.updateStudentFormAnswers);
// Assign ops to a registration (super admin only)
router.post('/registrations/:registrationId/assign-ops', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), superAdminStudentController_1.assignOps);
// Switch active ops (super admin only)
router.post('/registrations/:registrationId/switch-active-ops', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), superAdminStudentController_1.switchActiveOps);
exports.default = router;
//# sourceMappingURL=superAdminStudentRoutes.js.map