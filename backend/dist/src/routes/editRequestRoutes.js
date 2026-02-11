"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const editRequestController_1 = require("../controllers/editRequestController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/edit-requests
 * @desc    Create edit request
 * @access  Private (Student/Counselor)
 */
router.post('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.COUNSELOR]), editRequestController_1.createEditRequest);
/**
 * @route   GET /api/edit-requests/pending
 * @desc    Get pending edit requests (for approver)
 * @access  Private (Counselor/Admin)
 */
router.get('/pending', (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), editRequestController_1.getPendingEditRequests);
/**
 * @route   GET /api/edit-requests/my-requests
 * @desc    Get my edit requests (student view)
 * @access  Private (Student)
 */
router.get('/my-requests', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT]), editRequestController_1.getMyEditRequests);
/**
 * @route   GET /api/edit-requests
 * @desc    Get all edit requests (Admin view)
 * @access  Private (Admin only)
 */
router.get('/', (0, authorize_1.authorize)([roles_1.USER_ROLE.ADMIN]), editRequestController_1.getAllEditRequests);
/**
 * @route   PATCH /api/edit-requests/:id/approve
 * @desc    Approve edit request
 * @access  Private (Counselor/Admin)
 */
router.patch('/:id/approve', (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), editRequestController_1.approveEditRequest);
/**
 * @route   PATCH /api/edit-requests/:id/reject
 * @desc    Reject edit request
 * @access  Private (Counselor/Admin)
 */
router.patch('/:id/reject', (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), editRequestController_1.rejectEditRequest);
exports.default = router;
//# sourceMappingURL=editRequestRoutes.js.map