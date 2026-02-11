import { Request, Response } from 'express';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import Student from '../models/Student';
import Service from '../models/Service';
import Counselor from '../models/Counselor';
import { AuthRequest } from '../middleware/auth';
import { USER_ROLE } from '../types/roles';

/**
 * @desc    Enroll student in a service
 * @route   POST /api/enrollments
 * @access  Private (Student only)
 */
export const enrollInService = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceId } = req.body;
    const userId = req.user!.userId;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    // Check if service exists and is active
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or inactive',
      });
    }

    // Get or create student profile
    let student = await Student.findOne({ user: userId });
    if (!student) {
      student = await Student.create({ user: userId });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: student._id,
      service: serviceId,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this service',
        data: { enrollment: existingEnrollment },
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: student._id,
      service: serviceId,
      status: EnrollmentStatus.NOT_STARTED,
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('service', 'name description')
      .populate('student');

    return res.status(201).json({
      success: true,
      message: 'Successfully enrolled in service',
      data: { enrollment: populatedEnrollment },
    });
  } catch (error: any) {
    console.error('Error enrolling in service:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all enrollments for current user
 * @route   GET /api/enrollments
 * @access  Private (Student only)
 */
export const getMyEnrollments = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.userId;

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(200).json({
        success: true,
        data: { enrollments: [], count: 0 },
      });
    }

    const enrollments = await Enrollment.find({ student: student._id })
      .populate('service', 'name description isActive')
      .populate('assignedCounselor')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        enrollments,
        count: enrollments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get enrollment by ID
 * @route   GET /api/enrollments/:id
 * @access  Private (Student/Counselor/Admin)
 */
export const getEnrollmentById = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const enrollment = await Enrollment.findById(id)
      .populate('service')
      .populate('student')
      .populate('assignedCounselor');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Authorization check
    const student = await Student.findById(enrollment.student);
    if (
      userRole !== USER_ROLE.ADMIN &&
      userRole !== USER_ROLE.COUNSELOR &&
      student?.userId.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this enrollment',
      });
    }

    return res.status(200).json({
      success: true,
      data: { enrollment },
    });
  } catch (error: any) {
    console.error('Error fetching enrollment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Update enrollment status
 * @route   PATCH /api/enrollments/:id/status
 * @access  Private (Student/Counselor/Admin)
 */
export const updateEnrollmentStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(EnrollmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required',
      });
    }

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    enrollment.status = status;
    await enrollment.save();

    const updatedEnrollment = await Enrollment.findById(id)
      .populate('service', 'name description')
      .populate('assignedCounselor');

    return res.status(200).json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: { enrollment: updatedEnrollment },
    });
  } catch (error: any) {
    console.error('Error updating enrollment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Assign counselor to enrollment
 * @route   PATCH /api/enrollments/:id/assign-counselor
 * @access  Private (Admin only)
 */
export const assignCounselor = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { counselorId } = req.body;

    if (!counselorId) {
      return res.status(400).json({
        success: false,
        message: 'Counselor ID is required',
      });
    }

    // Check if counselor exists
    const counselor = await Counselor.findById(counselorId);
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor not found',
      });
    }

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    enrollment.assignedCounselor = counselorId;
    await enrollment.save();

    const updatedEnrollment = await Enrollment.findById(id)
      .populate('service', 'name description')
      .populate('assignedCounselor')
      .populate('student');

    return res.status(200).json({
      success: true,
      message: 'Counselor assigned successfully',
      data: { enrollment: updatedEnrollment },
    });
  } catch (error: any) {
    console.error('Error assigning counselor:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all enrollments (Admin/Counselor)
 * @route   GET /api/enrollments/all
 * @access  Private (Admin/Counselor only)
 */
export const getAllEnrollments = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status, serviceId, counselorId } = req.query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (serviceId) {
      filter.service = serviceId;
    }

    if (counselorId) {
      filter.assignedCounselor = counselorId;
    }

    const enrollments = await Enrollment.find(filter)
      .populate('student')
      .populate('service', 'name description')
      .populate('assignedCounselor')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        enrollments,
        count: enrollments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching all enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get enrollments for assigned counselor
 * @route   GET /api/enrollments/my-students
 * @access  Private (Counselor only)
 */
export const getMyCounselingEnrollments = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.userId;

    // Get counselor profile
    const counselor = await Counselor.findOne({ user: userId });
    if (!counselor) {
      return res.status(200).json({
        success: true,
        data: { enrollments: [], count: 0 },
      });
    }

    const enrollments = await Enrollment.find({ assignedCounselor: counselor._id })
      .populate('student')
      .populate('service', 'name description')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        enrollments,
        count: enrollments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching counseling enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

