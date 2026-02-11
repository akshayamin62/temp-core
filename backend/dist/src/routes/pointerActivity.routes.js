"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pointerActivity_controller_1 = require("../controllers/pointerActivity.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// Ivy Expert selects activities
router.post('/select', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.selectActivitiesHandler);
// Student / Ivy Expert fetch activities
router.get('/student/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointerActivity_controller_1.getStudentActivitiesHandler);
router.get('/student', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointerActivity_controller_1.getStudentActivitiesHandler);
// Student uploads proof files
router.post('/proof/upload', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointerActivity_controller_1.proofUploadMiddleware, pointerActivity_controller_1.uploadProofHandler);
// Ivy Expert uploads documents for activities
router.post('/ivy-expert/documents', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.ivyExpertDocsMiddleware, pointerActivity_controller_1.uploadIvyExpertDocumentsHandler);
// Ivy Expert updates task completion status
router.post('/ivy-expert/task/status', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.updateDocumentTaskStatusHandler);
// Ivy Expert updates weightages for activities
router.put('/weightages', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.updateWeightagesHandler);
// Ivy Expert evaluates submission
router.post('/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.evaluateActivityHandler);
// Ivy Expert sets deadline for an activity
router.post('/deadline', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointerActivity_controller_1.setDeadlineHandler);
// Get pointer activity score
router.get('/score/:studentIvyServiceId/:pointerNo', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointerActivity_controller_1.getPointerActivityScoreHandler);
router.get('/score', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointerActivity_controller_1.getPointerActivityScoreHandler);
exports.default = router;
//# sourceMappingURL=pointerActivity.routes.js.map