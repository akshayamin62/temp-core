"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const programController_1 = require("../controllers/programController");
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
        }
    },
});
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Student routes
router.get('/student/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), programController_1.getStudentPrograms);
router.post('/student/programs/select', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), programController_1.selectProgram);
router.post('/student/programs/create', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), programController_1.createProgram);
router.delete('/student/programs/:programId', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), programController_1.removeProgram);
// OPS routes
router.get('/ops/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS]), programController_1.getOpsPrograms);
router.get('/ops/student/:studentId/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR]), programController_1.getOpsStudentPrograms);
router.post('/ops/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS]), programController_1.createProgram);
router.post('/ops/student/:studentId/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS]), programController_1.createProgram);
router.post('/ops/programs/upload-excel', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS]), upload.single('file'), programController_1.uploadProgramsFromExcel);
router.post('/ops/student/:studentId/programs/upload-excel', (0, authorize_1.authorize)([roles_1.USER_ROLE.OPS]), upload.single('file'), programController_1.uploadProgramsFromExcel);
// Super Admin routes
router.get('/super-admin/student/:studentId/programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), programController_1.getSuperAdminStudentPrograms);
router.get('/super-admin/student/:studentId/applied-programs', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), programController_1.getStudentAppliedPrograms);
router.post('/super-admin/programs/create', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), programController_1.createProgram);
router.post('/super-admin/programs/upload-excel', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), upload.single('file'), programController_1.uploadProgramsFromExcel);
router.put('/super-admin/programs/:programId/selection', (0, authorize_1.authorize)([roles_1.USER_ROLE.SUPER_ADMIN]), programController_1.updateProgramSelection);
exports.default = router;
//# sourceMappingURL=programRoutes.js.map