import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Parent from '../models/Parent';
import Student from '../models/Student';
import User from '../models/User';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import { USER_ROLE } from '../types/roles';

/**
 * Get all students linked to the logged-in parent
 */
export const getParentStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const parentDoc = await Parent.findOne({ userId });
    if (!parentDoc) {
      return res.status(404).json({
        success: false,
        message: 'Parent profile not found',
      });
    }

    if (!parentDoc.studentIds || parentDoc.studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No students found',
        data: { students: [], total: 0 },
      });
    }

    const students = await Student.find({ _id: { $in: parentDoc.studentIds } })
      .populate('userId', 'firstName middleName lastName email profilePicture isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .populate({
        path: 'counselorId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .sort({ createdAt: -1 });

    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const registrationCount = await StudentServiceRegistration.countDocuments({
          studentId: student._id,
        });
        return {
          _id: student._id,
          user: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          counselorId: student.counselorId,
          intake: student.intake,
          year: student.year,
          registrationCount,
          createdAt: student.createdAt,
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
    console.error('Get parent students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
};

/**
 * Get student details for parent (read-only)
 * Verifies the student belongs to this parent
 */
export const getParentStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;

    const parentDoc = await Parent.findOne({ userId });
    if (!parentDoc) {
      return res.status(404).json({
        success: false,
        message: 'Parent profile not found',
      });
    }

    // Verify this student belongs to the parent
    if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - This student is not linked to your account',
      });
    }

    const student = await Student.findById(studentId)
      .populate('userId', 'firstName middleName lastName email role profilePicture isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .populate({
        path: 'counselorId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .populate({
        path: 'referrerId',
        populate: { path: 'userId', select: 'firstName middleName lastName' },
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const registrations = await StudentServiceRegistration.find({ studentId })
      .populate('serviceId', 'name slug shortDescription')
      .populate({
        path: 'primaryOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .populate({
        path: 'secondaryOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
      })
      .populate({
        path: 'activeOpsId',
        populate: { path: 'userId', select: 'firstName middleName lastName email' },
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
    console.error('Get parent student details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student details',
    });
  }
};

/**
 * Get student form answers for a registration (read-only for parent)
 * Verifies the student belongs to this parent
 */
export const getParentStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;
    const userId = req.user?.userId;

    const parentDoc = await Parent.findOne({ userId });
    if (!parentDoc) {
      return res.status(404).json({
        success: false,
        message: 'Parent profile not found',
      });
    }

    // Verify this student belongs to the parent
    if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - This student is not linked to your account',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const answers = await StudentFormAnswer.find({ studentId }).lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Form answers fetched successfully',
      data: {
        registration,
        answers,
      },
    });
  } catch (error: any) {
    console.error('Get parent student form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form answers',
    });
  }
};
