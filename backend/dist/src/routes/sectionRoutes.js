"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sectionController_1 = require("../controllers/sectionController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/sections
 * @desc    Create a new section
 * @access  Private (Admin only)
 */
router.post('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), sectionController_1.createSection);
/**
 * @route   GET /api/sections
 * @desc    Get all sections (global or all)
 * @access  Private (Admin only)
 */
router.get('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), sectionController_1.getAllSections);
/**
 * @route   GET /api/sections/:id
 * @desc    Get section by ID
 * @access  Private (Admin only)
 */
router.get('/:id', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), sectionController_1.getSectionById);
/**
 * @route   PUT /api/sections/:id
 * @desc    Update section (with reusability logic)
 * @access  Private (Admin only)
 */
router.put('/:id', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), sectionController_1.updateSection);
/**
 * @route   PATCH /api/sections/:id/toggle-status
 * @desc    Activate/Deactivate section
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), sectionController_1.toggleSectionStatus);
exports.default = router;
//# sourceMappingURL=sectionRoutes.js.map