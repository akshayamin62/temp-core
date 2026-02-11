"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questionController_1 = require("../controllers/questionController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/questions/metadata
 * @desc    Get question types and edit policies
 * @access  Private (Admin only)
 */
router.get('/metadata', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.getQuestionMetadata);
/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
router.post('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.createQuestion);
/**
 * @route   GET /api/questions
 * @desc    Get all questions with filters
 * @access  Private (Admin only)
 */
router.get('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.getAllQuestions);
/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Private (Admin only)
 */
router.get('/:id', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.getQuestionById);
/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
router.put('/:id', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.updateQuestion);
/**
 * @route   PATCH /api/questions/:id/toggle-status
 * @desc    Activate/Deactivate question
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), questionController_1.toggleQuestionStatus);
exports.default = router;
//# sourceMappingURL=questionRoutes.js.map