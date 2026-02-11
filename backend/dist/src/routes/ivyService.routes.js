"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ivyService_controller_1 = require("../controllers/ivyService.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// POST /api/ivy/ivy-service - Create new Ivy League service
router.post('/', (0, authorize_1.authorize)(roles_1.USER_ROLE.SUPER_ADMIN), ivyService_controller_1.createIvyService);
// GET /api/ivy/ivy-service/my-students - Auth-based: get students for logged-in ivy expert
router.get('/my-students', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), ivyService_controller_1.getMyStudentsHandler);
// GET /api/ivy/ivy-service/my-service - Auth-based: get logged-in student's ivy service
router.get('/my-service', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), ivyService_controller_1.getMyServiceHandler);
// GET /api/ivy/ivy-service/ivy-expert/:ivyExpertId/students (legacy, param-based)
router.get('/ivy-expert/:ivyExpertId/students', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.SUPER_ADMIN]), ivyService_controller_1.getStudentsForIvyExpertHandler);
// GET /api/ivy/ivy-service/student/:studentId - Get service for a student
router.get('/student/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), ivyService_controller_1.getServiceByStudentIdHandler);
// GET /api/ivy/ivy-service/:serviceId - Get service details
router.get('/:serviceId', ivyService_controller_1.getServiceDetailsHandler);
// PUT /api/ivy/ivy-service/:serviceId/interest - Update student interest
router.put('/:serviceId/interest', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.SUPER_ADMIN]), ivyService_controller_1.updateInterestHandler);
exports.default = router;
//# sourceMappingURL=ivyService.routes.js.map