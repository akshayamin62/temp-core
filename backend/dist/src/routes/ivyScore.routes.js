"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ivyScore_controller_1 = require("../controllers/ivyScore.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// GET /api/ivy/ivy-score/my-score - Auth-based: get logged-in student's ivy score
router.get('/my-score', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), ivyScore_controller_1.getMyIvyScore);
// GET /api/ivy/ivy-score/:studentId - Get Ivy score for a student
router.get('/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), ivyScore_controller_1.getStudentIvyScore);
// POST /api/ivy/ivy-score/recalculate/:studentId - Manually recalculate score
router.post('/recalculate/:studentId', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), ivyScore_controller_1.recalculateIvyScore);
exports.default = router;
//# sourceMappingURL=ivyScore.routes.js.map