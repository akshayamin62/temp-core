"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const answerController_1 = require("../controllers/answerController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/answers/save-section
 * @desc    Save entire section answers at once (bulk save)
 * @access  Private (Student only)
 */
router.post('/save-section', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.saveSectionAnswers);
/**
 * @route   POST /api/answers/save
 * @desc    Save/Update answer for a question (legacy - kept for compatibility)
 * @access  Private (Student only)
 */
router.post('/save', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.saveAnswer);
/**
 * @route   GET /api/answers/service/:serviceId
 * @desc    Get answers for a service (with auto-fill)
 * @access  Private (Student only)
 */
router.get('/service/:serviceId', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.getServiceAnswers);
/**
 * @route   POST /api/answers/add-section-instance
 * @desc    Add new instance of repeatable section
 * @access  Private (Student only)
 */
router.post('/add-section-instance', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.addSectionInstance);
/**
 * @route   DELETE /api/answers/remove-section-instance
 * @desc    Remove instance of repeatable section
 * @access  Private (Student only)
 */
router.delete('/remove-section-instance', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.removeSectionInstance);
/**
 * @route   POST /api/answers/submit
 * @desc    Submit form (mark enrollment as submitted)
 * @access  Private (Student only)
 */
router.post('/submit', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), answerController_1.submitForm);
/**
 * @route   GET /api/answers/student/:studentId
 * @desc    Get all answers for a student (Admin/Counselor view)
 * @access  Private (Admin/Counselor only)
 */
router.get('/student/:studentId', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR]), answerController_1.getStudentAnswers);
exports.default = router;
//# sourceMappingURL=answerRoutes.js.map