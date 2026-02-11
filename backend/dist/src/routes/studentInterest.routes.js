"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentInterest_controller_1 = require("../controllers/studentInterest.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// GET /api/student-interest?studentIvyServiceId=xxx - Get student interest
router.get('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), studentInterest_controller_1.getStudentInterestData);
// PATCH /api/student-interest - Update student interest (Ivy Expert only)
router.patch('/', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), studentInterest_controller_1.patchStudentInterest);
exports.default = router;
//# sourceMappingURL=studentInterest.routes.js.map