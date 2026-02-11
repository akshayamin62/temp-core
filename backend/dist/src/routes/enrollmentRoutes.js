"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enrollmentController_1 = require("../controllers/enrollmentController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/enrollments
 * @desc    Enroll in a service
 * @access  Private (Student only)
 */
router.post('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), enrollmentController_1.enrollInService);
/**
 * @route   GET /api/enrollments
 * @desc    Get my enrollments
 * @access  Private (Student only)
 */
router.get('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), enrollmentController_1.getMyEnrollments);
/**
 * @route   GET /api/enrollments/all
 * @desc    Get all enrollments (Admin/Counselor)
 * @access  Private (Admin/Counselor only)
 */
router.get('/all', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.COUNSELOR]), enrollmentController_1.getAllEnrollments);
/**
 * @route   GET /api/enrollments/my-students
 * @desc    Get enrollments for assigned counselor
 * @access  Private (Counselor only)
 */
router.get('/my-students', (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR]), enrollmentController_1.getMyCounselingEnrollments);
/**
 * @route   GET /api/enrollments/:id
 * @desc    Get enrollment by ID
 * @access  Private (Student/Counselor/Admin)
 */
router.get('/:id', enrollmentController_1.getEnrollmentById);
/**
 * @route   PATCH /api/enrollments/:id/status
 * @desc    Update enrollment status
 * @access  Private (Student/Counselor/Admin)
 */
router.patch('/:id/status', enrollmentController_1.updateEnrollmentStatus);
/**
 * @route   PATCH /api/enrollments/:id/assign-counselor
 * @desc    Assign counselor to enrollment
 * @access  Private (Admin only)
 */
router.patch('/:id/assign-counselor', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), enrollmentController_1.assignCounselor);
exports.default = router;
//# sourceMappingURL=enrollmentRoutes.js.map