import { Request, Response } from 'express';
import { EditRequest, EditRequestStatus, RequestedByRole, ApprovedByRole } from '../models/EditRequest';
import Student from '../models/Student';
// import { Counselor } from '../models/Counselor';
import { Question, EditPolicy } from '../models/Question';
import { Answer } from '../models/Answer';
import { AuthRequest } from '../middleware/auth';
import { USER_ROLE } from '../types/roles';

/**
 * @desc    Create edit request
 * @route   POST /api/edit-requests
 * @access  Private (Student/Counselor)
 */
export const createEditRequest = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const {
      serviceId,
      sectionId,
      sectionInstanceId,
      questionId,
      requestedValue,
      reason,
    } = req.body;

    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Validate required fields
    if (!serviceId || !sectionId || !sectionInstanceId || !questionId || requestedValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Get student profile
    let studentId;
    if (userRole === USER_ROLE.STUDENT) {
      const student = await Student.findOne({ user: userId });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }
      studentId = student._id;
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // For counselor, studentId should be provided in request
      if (!req.body.studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required for counselor requests',
        });
      }
      studentId = req.body.studentId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only students and counselors can create edit requests',
      });
    }

    // Get question to check edit policy
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Get current value from Answer document
    const answerDoc = await Answer.findOne({ student: studentId });
    let currentValue = null;

    if (answerDoc) {
      const sectionAnswer = answerDoc.answers.find(
        (a) =>
          a.section.toString() === sectionId &&
          a.sectionInstanceId === sectionInstanceId
      );

      if (sectionAnswer) {
        const questionValue = sectionAnswer.values.find(
          (v) => v.question.toString() === questionId
        );
        if (questionValue) {
          currentValue = questionValue.value;
        }
      }
    }

    // Create edit request
    const editRequest = await EditRequest.create({
      student: studentId,
      service: serviceId,
      section: sectionId,
      sectionInstanceId,
      question: questionId,
      currentValue,
      requestedValue,
      requestedBy: userRole === USER_ROLE.STUDENT ? RequestedByRole.STUDENT : RequestedByRole.COUNSELOR,
      requestedByUser: userId,
      reason,
      status: EditRequestStatus.PENDING,
    });

    const populatedRequest = await EditRequest.findById(editRequest._id)
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
  } catch (error: any) {
    console.error('Error creating edit request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get pending edit requests (for approver)
 * @route   GET /api/edit-requests/pending
 * @access  Private (Counselor/Admin)
 */
export const getPendingEditRequests = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userRole = req.user!.role;

    const filter: any = { status: EditRequestStatus.PENDING };

    // If counselor, only show requests they can approve (based on question editPolicy)
    // This requires a more complex query - for now, show all pending
    // TODO: Filter based on editPolicy

    const editRequests = await EditRequest.find(filter)
      .populate('student')
      .populate('service', 'name')
      .populate('section', 'title')
      .populate('question', 'label type editPolicy')
      .populate('requestedByUser', 'name email role')
      .sort({ createdAt: -1 });

    // Filter based on edit policy
    const filteredRequests = editRequests.filter((req: any) => {
      const question = req.question;
      if (!question) return false;

      if (userRole === USER_ROLE.ADMIN) {
        // Admin can approve all
        return true;
      } else if (userRole === USER_ROLE.COUNSELOR) {
        // Counselor can only approve if editPolicy is COUNSELOR or STUDENT
        return question.editPolicy === EditPolicy.COUNSELOR || question.editPolicy === EditPolicy.STUDENT;
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
  } catch (error: any) {
    console.error('Error fetching pending edit requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get my edit requests (student view)
 * @route   GET /api/edit-requests/my-requests
 * @access  Private (Student only)
 */
export const getMyEditRequests = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.userId;

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(200).json({
        success: true,
        data: { editRequests: [], count: 0 },
      });
    }

    const editRequests = await EditRequest.find({ student: student._id })
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
  } catch (error: any) {
    console.error('Error fetching my edit requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Approve edit request
 * @route   PATCH /api/edit-requests/:id/approve
 * @access  Private (Counselor/Admin)
 */
export const approveEditRequest = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const editRequest = await EditRequest.findById(id).populate('question');
    if (!editRequest) {
      return res.status(404).json({
        success: false,
        message: 'Edit request not found',
      });
    }

    if (editRequest.status !== EditRequestStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Edit request has already been processed',
      });
    }

    // Check authorization based on question editPolicy
    const question = editRequest.question as any;
    if (userRole === USER_ROLE.COUNSELOR) {
      if (question.editPolicy === EditPolicy.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can approve this edit request',
        });
      }
    }

    // Update answer document
    const answerDoc = await Answer.findOne({ student: editRequest.student });
    if (answerDoc) {
      const sectionAnswer = answerDoc.answers.find(
        (a) =>
          a.section.toString() === editRequest.section.toString() &&
          a.sectionInstanceId === editRequest.sectionInstanceId
      );

      if (sectionAnswer) {
        let questionValue = sectionAnswer.values.find(
          (v) => v.question.toString() === editRequest.question.toString()
        );

        if (questionValue) {
          // Add to history
          questionValue.updateHistory.push({
            value: questionValue.value,
            updatedAt: new Date(),
            updatedBy: userRole === USER_ROLE.ADMIN ? 'ADMIN' : 'COUNSELOR',
            updatedByUser: userId as any,
          });
          questionValue.value = editRequest.requestedValue;
        } else {
          // Create new question value
          sectionAnswer.values.push({
            question: editRequest.question as any,
            value: editRequest.requestedValue,
            updateHistory: [
              {
                value: editRequest.requestedValue,
                updatedAt: new Date(),
                updatedBy: userRole === USER_ROLE.ADMIN ? 'ADMIN' : 'COUNSELOR',
                updatedByUser: userId as any,
              },
            ],
          });
        }

        await answerDoc.save();
      }
    }

    // Update edit request
    editRequest.status = EditRequestStatus.APPROVED;
    editRequest.approvedBy = userRole === USER_ROLE.ADMIN ? ApprovedByRole.ADMIN : ApprovedByRole.COUNSELOR;
    editRequest.approvedByUser = userId as any;
    await editRequest.save();

    const updatedRequest = await EditRequest.findById(id)
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
  } catch (error: any) {
    console.error('Error approving edit request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Reject edit request
 * @route   PATCH /api/edit-requests/:id/reject
 * @access  Private (Counselor/Admin)
 */
export const rejectEditRequest = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const editRequest = await EditRequest.findById(id).populate('question');
    if (!editRequest) {
      return res.status(404).json({
        success: false,
        message: 'Edit request not found',
      });
    }

    if (editRequest.status !== EditRequestStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Edit request has already been processed',
      });
    }

    // Check authorization based on question editPolicy
    const question = editRequest.question as any;
    if (userRole === USER_ROLE.COUNSELOR) {
      if (question.editPolicy === EditPolicy.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can reject this edit request',
        });
      }
    }

    // Update edit request
    editRequest.status = EditRequestStatus.REJECTED;
    editRequest.approvedBy = userRole === USER_ROLE.ADMIN ? ApprovedByRole.ADMIN : ApprovedByRole.COUNSELOR;
    editRequest.approvedByUser = userId as any;
    editRequest.rejectionReason = rejectionReason;
    await editRequest.save();

    const updatedRequest = await EditRequest.findById(id)
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
  } catch (error: any) {
    console.error('Error rejecting edit request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all edit requests (Admin view)
 * @route   GET /api/edit-requests
 * @access  Private (Admin only)
 */
export const getAllEditRequests = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status, studentId, serviceId } = req.query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (studentId) {
      filter.student = studentId;
    }

    if (serviceId) {
      filter.service = serviceId;
    }

    const editRequests = await EditRequest.find(filter)
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
  } catch (error: any) {
    console.error('Error fetching all edit requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

