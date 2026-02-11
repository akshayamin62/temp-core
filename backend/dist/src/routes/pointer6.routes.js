"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pointer6_controller_1 = require("../controllers/pointer6.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// POST /pointer6/course-list/upload - Ivy Expert uploads course list Excel
router.post('/course-list/upload', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer6_controller_1.uploadCourseListMiddleware, pointer6_controller_1.uploadCourseListHandler);
// POST /pointer6/certificate/upload - Student uploads certificates (multiple)
router.post('/certificate/upload', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer6_controller_1.uploadCertificatesMiddleware, pointer6_controller_1.uploadCertificatesHandler);
// PUT /pointer6/certificate/:certificateId/replace - Student replaces a certificate
router.put('/certificate/:certificateId/replace', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer6_controller_1.replaceCertificateMiddleware, pointer6_controller_1.replaceCertificateHandler);
// DELETE /pointer6/certificate/:certificateId - Student deletes a certificate
router.delete('/certificate/:certificateId', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer6_controller_1.deleteCertificateHandler);
// POST /pointer6/certificate/:certificateId/evaluate - Ivy Expert evaluates individual certificate
router.post('/certificate/:certificateId/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer6_controller_1.evaluateCertificateHandler);
// POST /pointer6/evaluate - Ivy Expert assigns score (DEPRECATED - use individual certificate evaluation)
router.post('/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer6_controller_1.evaluatePointer6Handler);
// GET /pointer6/status/:studentId - by studentId
// GET /pointer6/status?studentIvyServiceId=xxx - by serviceId
router.get('/status', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6StatusHandler);
router.get('/status/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6StatusHandler);
// GET /pointer6/score/:studentIvyServiceId - Get pointer6 average score
router.get('/score/:studentIvyServiceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6ScoreHandler);
router.get('/score', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6ScoreHandler);
// POST /pointer6/select-course - Select a course with start and end dates
router.post('/select-course', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.IVY_EXPERT]), pointer6_controller_1.selectCourseHandler);
// POST /pointer6/unselect-course - Unselect a course
router.post('/unselect-course', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.IVY_EXPERT]), pointer6_controller_1.unselectCourseHandler);
// POST /pointer6/upload-course-certificate - Upload certificate for selected course
router.post('/upload-course-certificate', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer6_controller_1.uploadCourseCertificateMiddleware, pointer6_controller_1.uploadCourseCertificateHandler);
// POST /pointer6/score-course-certificate - Score a course certificate
router.post('/score-course-certificate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer6_controller_1.scoreCourseCertificateHandler);
// GET /pointer6/course-score/:studentIvyServiceId - Get Pointer 6 course average score
router.get('/course-score/:studentIvyServiceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6CourseScoreHandler);
router.get('/course-score', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer6_controller_1.getPointer6CourseScoreHandler);
exports.default = router;
//# sourceMappingURL=pointer6.routes.js.map