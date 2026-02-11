import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Admin from '../models/Admin';
import Counselor from '../models/Counselor';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import LeadStudentConversion from '../models/LeadStudentConversion';
import { USER_ROLE } from '../types/roles';

/**
 * Get all students for the admin (students converted under this admin)
 * Admin can only see students that were converted under their admin
 */
export const getAdminStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (!user || (user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.COUNSELOR && user.role !== USER_ROLE.SUPER_ADMIN)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    let adminId: any = null;
    let counselorId: any = null;
    
    // Get admin or counselor reference
    if (user.role === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin record not found',
        });
      }
      adminId = admin._id;
    } else if (user.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: 'Counselor record not found',
        });
      }
      counselorId = counselor._id;
    }
    
    // Find all students under this admin or assigned to this counselor
    const studentQuery: any = {};
    if (adminId) {
      studentQuery.adminId = adminId;
    } else if (counselorId) {
      studentQuery.counselorId = counselorId;
    }
    
    const students = await Student.find(studentQuery)
      .populate('userId', 'firstName middleName lastName email isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email'
        }
      })
      .populate({
        path: 'counselorId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName email'
        }
      })
      .sort({ createdAt: -1 });

    // Get registration count and conversion info for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const registrationCount = await StudentServiceRegistration.countDocuments({
          studentId: student._id,
        });

        // Get conversion info if exists
        const conversion = await LeadStudentConversion.findOne({
          studentId: student._id,
        }).populate({
          path: 'leadId',
          select: 'name email mobileNumber'
        });

        return {
          _id: student._id,
          user: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          counselorId: student.counselorId,
          registrationCount,
          createdAt: student.createdAt,
          convertedFromLead: conversion?.leadId || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: {
        students: studentsWithStats,
        total: studentsWithStats.length,
      },
    });
  } catch (error: any) {
    console.error('Get admin students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
};

/**
 * Get student details (read-only for admin)
 */
export const getAdminStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user || (user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.COUNSELOR && user.role !== USER_ROLE.SUPER_ADMIN)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findById(studentId)
      .populate('userId', 'firstName middleName lastName name email role isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName name email'
        }
      })
      .populate({
        path: 'counselorId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName name email'
        }
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // For admin, verify this student belongs to their admin
    if (user.role === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin || student.adminId?._id?.toString() !== admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Student does not belong to your admin',
        });
      }
    }

    // For counselor, verify this student is assigned to them
    if (user.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(403).json({
          success: false,
          message: 'Counselor not found',
        });
      }
      
      // Check if student is assigned to this counselor
      if (!student.counselorId || student.counselorId._id?.toString() !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Student is not assigned to you',
        });
      }
    }

    // Get registrations
    const registrations = await StudentServiceRegistration.find({ studentId })
      .populate('serviceId', 'name slug shortDescription')
      .populate({
        path: 'primaryOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'secondaryOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'activeOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Student details fetched successfully',
      data: {
        student,
        registrations,
      },
    });
  } catch (error: any) {
    console.error('Get student details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student details',
      error: error.message,
    });
  }
};

/**
 * Get student form answers for a registration (read-only for admin)
 */
export const getAdminStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user || (user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.COUNSELOR && user.role !== USER_ROLE.SUPER_ADMIN)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get student to verify ownership
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // For admin, verify this student belongs to their admin
    if (user.role === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin || student.adminId?.toString() !== admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Student does not belong to your admin',
        });
      }
    }

    // For counselor, verify this student is assigned to them
    if (user.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(403).json({
          success: false,
          message: 'Counselor not found',
        });
      }
      
      // Check if student is assigned to this counselor
      if (!student.counselorId || student.counselorId.toString() !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Student is not assigned to you',
        });
      }
    }

    // Get registration
    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Get form answers
    const answers = await StudentFormAnswer.find({
      studentId,
      registrationId,
    }).lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Form answers fetched successfully',
      data: {
        registration,
        answers,
      },
    });
  } catch (error: any) {
    console.error('Get form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form answers',
      error: error.message,
    });
  }
};

/**
 * Get student by lead ID (for converted leads)
 */
export const getStudentByLeadId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user || (user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.COUNSELOR && user.role !== USER_ROLE.SUPER_ADMIN)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Find conversion record
    const conversion = await LeadStudentConversion.findOne({
      leadId,
      status: 'APPROVED'
    }).populate({
      path: 'createdStudentId',
      populate: [
        { path: 'userId', select: 'firstName middleName lastName email isVerified isActive createdAt' },
        { path: 'adminId', populate: { path: 'userId', select: 'firstName middleName lastName email' } },
        { path: 'counselorId', populate: { path: 'userId', select: 'firstName middleName lastName email' } }
      ]
    });

    if (!conversion || !conversion.createdStudentId) {
      return res.status(404).json({
        success: false,
        message: 'No converted student found for this lead',
      });
    }

    const student = conversion.createdStudentId as any;

    // Get registrations
    const registrations = await StudentServiceRegistration.find({ studentId: student._id })
      .populate('serviceId', 'name slug shortDescription')
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Student found successfully',
      data: {
        student,
        registrations,
        conversion: {
          _id: conversion._id,
          status: conversion.status,
          approvedAt: conversion.approvedAt,
        }
      },
    });
  } catch (error: any) {
    console.error('Get student by lead ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message,
    });
  }
};
