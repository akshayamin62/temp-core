"use strict";
// Pointer 5: Authentic & Reflective Storytelling Routes
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pointer5_controller_1 = require("../controllers/pointer5.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// Task Routes (Ivy Expert)
router.post('/task', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer5_controller_1.uploadAttachmentsMiddleware, pointer5_controller_1.createTaskHandler);
router.put('/task', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer5_controller_1.uploadAttachmentsMiddleware, pointer5_controller_1.updateTaskHandler);
router.delete('/task/:taskId', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer5_controller_1.deleteTaskHandler);
router.get('/tasks/:studentIvyServiceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getTasksHandler);
router.get('/tasks', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getTasksHandler);
// Submission Routes (Student)
router.post('/submit', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer5_controller_1.submitResponseHandler);
// Evaluation Routes (Ivy Expert)
router.post('/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer5_controller_1.evaluateSubmissionHandler);
// Status Routes (All)
router.get('/status/:studentIvyServiceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getStatusHandler);
router.get('/status', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getStatusHandler);
// Score Route
router.get('/score/:studentIvyServiceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getScoreHandler);
router.get('/score', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer5_controller_1.getScoreHandler);
exports.default = router;
//# sourceMappingURL=pointer5.routes.js.map