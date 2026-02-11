"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pointer234Activity_controller_1 = require("../controllers/pointer234Activity.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// Health check route
router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Pointer 2/3/4 Activity routes are working' });
});
// POST /pointer/activity/select - Ivy Expert selects activities
router.post('/activity/select', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer234Activity_controller_1.selectActivitiesHandler);
// GET /pointer/activity/student/:studentId - Get student activities
router.get('/activity/student/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer234Activity_controller_1.getStudentActivitiesHandler);
// PUT /pointer/activity/weightages - Ivy Expert updates weightages
router.put('/activity/weightages', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer234Activity_controller_1.updateWeightagesHandler);
// POST /pointer/activity/proof/upload - Student uploads proof
router.post('/activity/proof/upload', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer234Activity_controller_1.uploadProofMiddleware, pointer234Activity_controller_1.uploadProofHandler);
// POST /pointer/activity/evaluate - Ivy Expert evaluates activity
router.post('/activity/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer234Activity_controller_1.evaluateActivityHandler);
exports.default = router;
//# sourceMappingURL=pointer234Activity.routes.js.map