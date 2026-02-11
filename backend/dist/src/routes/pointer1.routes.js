"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pointer1_controller_1 = require("../controllers/pointer1.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// POST /api/pointer1/upload - Student uploads a document
router.post('/upload', (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), pointer1_controller_1.academicUploadMiddleware, pointer1_controller_1.uploadAcademicDocumentHandler);
// POST /api/pointer1/evaluate - Ivy Expert evaluates Pointer 1
router.post('/evaluate', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), pointer1_controller_1.evaluateAcademicHandler);
// GET /api/pointer1/status/:studentId - Get status and documents
router.get('/status/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer1_controller_1.getAcademicStatusHandler);
// ========================
// Academic Data Routes (Formal/Informal)
// ========================
// GET /api/pointer1/academic/:studentId - Get academic data
router.get('/academic/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer1_controller_1.getAcademicDataHandler);
// POST /api/pointer1/academic/section - Add a section
router.post('/academic/section', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.addSectionHandler);
// POST /api/pointer1/academic/subsection - Add a sub-section
router.post('/academic/subsection', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.addSubSectionHandler);
// PUT /api/pointer1/academic/subsection - Update a sub-section
router.put('/academic/subsection', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.updateSubSectionHandler);
// POST /api/pointer1/academic/subject - Add a subject
router.post('/academic/subject', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.addSubjectHandler);
// PUT /api/pointer1/academic/subject - Update a subject
router.put('/academic/subject', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.updateSubjectHandler);
// DELETE /api/pointer1/academic/section - Delete a section
router.delete('/academic/section', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.deleteSectionHandler);
// DELETE /api/pointer1/academic/subsection - Delete a sub-section
router.delete('/academic/subsection', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.deleteSubSectionHandler);
// DELETE /api/pointer1/academic/subject - Delete a subject
router.delete('/academic/subject', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.deleteSubjectHandler);
// PUT /api/pointer1/academic/weightages - Update weightages for informal sections
router.put('/academic/weightages', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), pointer1_controller_1.updateWeightagesHandler);
// GET /api/pointer1/academic/score/:studentId - Get academic excellence score
router.get('/academic/score/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.SUPER_ADMIN]), pointer1_controller_1.getAcademicExcellenceScoreHandler);
exports.default = router;
//# sourceMappingURL=pointer1.routes.js.map