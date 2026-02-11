"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEditRequests = exports.rejectEditRequest = exports.approveEditRequest = exports.getMyEditRequests = exports.getPendingEditRequests = exports.createEditRequest = void 0;
const EditRequest_1 = require("../models/EditRequest");
const Student_1 = __importDefault(require("../models/Student"));
// import { Counselor } from '../models/Counselor';
const Question_1 = require("../models/Question");
const Answer_1 = require("../models/Answer");
const roles_1 = require("../types/roles");
/**
 * @desc    Create edit request
 * @route   POST /api/edit-requests
 * @access  Private (Student/Counselor)
 */
const createEditRequest = async (req, res) => {
    try {
        const { serviceId, sectionId, sectionInstanceId, questionId, requestedValue, reason, } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Validate required fields
        if (!serviceId || !sectionId || !sectionInstanceId || !questionId || requestedValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }
        // Get student profile
        let studentId;
        if (userRole === roles_1.USER_ROLE.STUDENT) {
            const student = await Student_1.default.findOne({ user: userId });
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student profile not found',
                });
            }
            studentId = student._id;
        }
        else if (userRole === roles_1.USER_ROLE.COUNSELOR) {
            // For counselor, studentId should be provided in request
            if (!req.body.studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required for counselor requests',
                });
            }
            studentId = req.body.studentId;
        }
        else {
            return res.status(403).json({
                success: false,
                message: 'Only students and counselors can create edit requests',
            });
        }
        // Get question to check edit policy
        const question = await Question_1.Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }
        // Get current value from Answer document
        const answerDoc = await Answer_1.Answer.findOne({ student: studentId });
        let currentValue = null;
        if (answerDoc) {
            const sectionAnswer = answerDoc.answers.find((a) => a.section.toString() === sectionId &&
                a.sectionInstanceId === sectionInstanceId);
            if (sectionAnswer) {
                const questionValue = sectionAnswer.values.find((v) => v.question.toString() === questionId);
                if (questionValue) {
                    currentValue = questionValue.value;
                }
            }
        }
        // Create edit request
        const editRequest = await EditRequest_1.EditRequest.create({
            student: studentId,
            service: serviceId,
            section: sectionId,
            sectionInstanceId,
            question: questionId,
            currentValue,
            requestedValue,
            requestedBy: userRole === roles_1.USER_ROLE.STUDENT ? EditRequest_1.RequestedByRole.STUDENT : EditRequest_1.RequestedByRole.COUNSELOR,
            requestedByUser: userId,
            reason,
            status: EditRequest_1.EditRequestStatus.PENDING,
        });
        const populatedRequest = await EditRequest_1.EditRequest.findById(editRequest._id)
            .populate('student')
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type')
            .populate('requestedByUser', 'name email role');
        return res.status(201).json({
            success: true,
            message: 'Edit request created successfully',
            data: { editRequest: populatedRequest },
        });
    }
    catch (error) {
        console.error('Error creating edit request:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.createEditRequest = createEditRequest;
/**
 * @desc    Get pending edit requests (for approver)
 * @route   GET /api/edit-requests/pending
 * @access  Private (Counselor/Admin)
 */
const getPendingEditRequests = async (req, res) => {
    try {
        const userRole = req.user.role;
        const filter = { status: EditRequest_1.EditRequestStatus.PENDING };
        // If counselor, only show requests they can approve (based on question editPolicy)
        // This requires a more complex query - for now, show all pending
        // TODO: Filter based on editPolicy
        const editRequests = await EditRequest_1.EditRequest.find(filter)
            .populate('student')
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type editPolicy')
            .populate('requestedByUser', 'name email role')
            .sort({ createdAt: -1 });
        // Filter based on edit policy
        const filteredRequests = editRequests.filter((req) => {
            const question = req.question;
            if (!question)
                return false;
            if (userRole === roles_1.USER_ROLE.ADMIN) {
                // Admin can approve all
                return true;
            }
            else if (userRole === roles_1.USER_ROLE.COUNSELOR) {
                // Counselor can only approve if editPolicy is COUNSELOR or STUDENT
                return question.editPolicy === Question_1.EditPolicy.COUNSELOR || question.editPolicy === Question_1.EditPolicy.STUDENT;
            }
            return false;
        });
        return res.status(200).json({
            success: true,
            data: {
                editRequests: filteredRequests,
                count: filteredRequests.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching pending edit requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getPendingEditRequests = getPendingEditRequests;
/**
 * @desc    Get my edit requests (student view)
 * @route   GET /api/edit-requests/my-requests
 * @access  Private (Student only)
 */
const getMyEditRequests = async (req, res) => {
    try {
        const userId = req.user.userId;
        const student = await Student_1.default.findOne({ user: userId });
        if (!student) {
            return res.status(200).json({
                success: true,
                data: { editRequests: [], count: 0 },
            });
        }
        const editRequests = await EditRequest_1.EditRequest.find({ student: student._id })
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type')
            .populate('approvedByUser', 'name email role')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                editRequests,
                count: editRequests.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching my edit requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getMyEditRequests = getMyEditRequests;
/**
 * @desc    Approve edit request
 * @route   PATCH /api/edit-requests/:id/approve
 * @access  Private (Counselor/Admin)
 */
const approveEditRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const editRequest = await EditRequest_1.EditRequest.findById(id).populate('question');
        if (!editRequest) {
            return res.status(404).json({
                success: false,
                message: 'Edit request not found',
            });
        }
        if (editRequest.status !== EditRequest_1.EditRequestStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message: 'Edit request has already been processed',
            });
        }
        // Check authorization based on question editPolicy
        const question = editRequest.question;
        if (userRole === roles_1.USER_ROLE.COUNSELOR) {
            if (question.editPolicy === Question_1.EditPolicy.ADMIN) {
                return res.status(403).json({
                    success: false,
                    message: 'Only admin can approve this edit request',
                });
            }
        }
        // Update answer document
        const answerDoc = await Answer_1.Answer.findOne({ student: editRequest.student });
        if (answerDoc) {
            const sectionAnswer = answerDoc.answers.find((a) => a.section.toString() === editRequest.section.toString() &&
                a.sectionInstanceId === editRequest.sectionInstanceId);
            if (sectionAnswer) {
                let questionValue = sectionAnswer.values.find((v) => v.question.toString() === editRequest.question.toString());
                if (questionValue) {
                    // Add to history
                    questionValue.updateHistory.push({
                        value: questionValue.value,
                        updatedAt: new Date(),
                        updatedBy: userRole === roles_1.USER_ROLE.ADMIN ? 'ADMIN' : 'COUNSELOR',
                        updatedByUser: userId,
                    });
                    questionValue.value = editRequest.requestedValue;
                }
                else {
                    // Create new question value
                    sectionAnswer.values.push({
                        question: editRequest.question,
                        value: editRequest.requestedValue,
                        updateHistory: [
                            {
                                value: editRequest.requestedValue,
                                updatedAt: new Date(),
                                updatedBy: userRole === roles_1.USER_ROLE.ADMIN ? 'ADMIN' : 'COUNSELOR',
                                updatedByUser: userId,
                            },
                        ],
                    });
                }
                await answerDoc.save();
            }
        }
        // Update edit request
        editRequest.status = EditRequest_1.EditRequestStatus.APPROVED;
        editRequest.approvedBy = userRole === roles_1.USER_ROLE.ADMIN ? EditRequest_1.ApprovedByRole.ADMIN : EditRequest_1.ApprovedByRole.COUNSELOR;
        editRequest.approvedByUser = userId;
        await editRequest.save();
        const updatedRequest = await EditRequest_1.EditRequest.findById(id)
            .populate('student')
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type')
            .populate('approvedByUser', 'name email role');
        return res.status(200).json({
            success: true,
            message: 'Edit request approved successfully',
            data: { editRequest: updatedRequest },
        });
    }
    catch (error) {
        console.error('Error approving edit request:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.approveEditRequest = approveEditRequest;
/**
 * @desc    Reject edit request
 * @route   PATCH /api/edit-requests/:id/reject
 * @access  Private (Counselor/Admin)
 */
const rejectEditRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const editRequest = await EditRequest_1.EditRequest.findById(id).populate('question');
        if (!editRequest) {
            return res.status(404).json({
                success: false,
                message: 'Edit request not found',
            });
        }
        if (editRequest.status !== EditRequest_1.EditRequestStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message: 'Edit request has already been processed',
            });
        }
        // Check authorization based on question editPolicy
        const question = editRequest.question;
        if (userRole === roles_1.USER_ROLE.COUNSELOR) {
            if (question.editPolicy === Question_1.EditPolicy.ADMIN) {
                return res.status(403).json({
                    success: false,
                    message: 'Only admin can reject this edit request',
                });
            }
        }
        // Update edit request
        editRequest.status = EditRequest_1.EditRequestStatus.REJECTED;
        editRequest.approvedBy = userRole === roles_1.USER_ROLE.ADMIN ? EditRequest_1.ApprovedByRole.ADMIN : EditRequest_1.ApprovedByRole.COUNSELOR;
        editRequest.approvedByUser = userId;
        editRequest.rejectionReason = rejectionReason;
        await editRequest.save();
        const updatedRequest = await EditRequest_1.EditRequest.findById(id)
            .populate('student')
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type')
            .populate('approvedByUser', 'name email role');
        return res.status(200).json({
            success: true,
            message: 'Edit request rejected successfully',
            data: { editRequest: updatedRequest },
        });
    }
    catch (error) {
        console.error('Error rejecting edit request:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.rejectEditRequest = rejectEditRequest;
/**
 * @desc    Get all edit requests (Admin view)
 * @route   GET /api/edit-requests
 * @access  Private (Admin only)
 */
const getAllEditRequests = async (req, res) => {
    try {
        const { status, studentId, serviceId } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (studentId) {
            filter.student = studentId;
        }
        if (serviceId) {
            filter.service = serviceId;
        }
        const editRequests = await EditRequest_1.EditRequest.find(filter)
            .populate('student')
            .populate('service', 'name')
            .populate('section', 'title')
            .populate('question', 'label type editPolicy')
            .populate('requestedByUser', 'name email role')
            .populate('approvedByUser', 'name email role')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                editRequests,
                count: editRequests.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching all edit requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getAllEditRequests = getAllEditRequests;
//# sourceMappingURL=editRequestController.js.map