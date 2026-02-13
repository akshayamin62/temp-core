import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Ops from '../models/Ops';
import IvyExpert from '../models/IvyExpert';
import EduplanCoach from '../models/EduplanCoach';
// import Service from '../models/Service';
// import Admin from '../models/Admin';
// import Counselor from '../models/Counselor';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import { USER_ROLE } from '../types/roles';

/**
 * Get all students with their registrations
 * For ops: only show students assigned to them
 * For admins: show all students
 */
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    const userRole = user?.role;
    
    let studentQuery: any = {};
    
    // If user is an ops, filter by active assignments only
    if (userRole === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'Ops record not found',
        });
      }
      
      // Get all registrations where this ops is ACTIVE
      // Note: Only active ops can see students
      // Fallback to primaryOpsId if activeOpsId is not set (for backward compatibility)
      const registrations = await StudentServiceRegistration.find({
        $or: [
          { activeOpsId: ops._id },
          { activeOpsId: { $exists: false }, primaryOpsId: ops._id },
          { activeOpsId: null, primaryOpsId: ops._id }
        ]
      }).select('studentId');
      
      const studentIds = [...new Set(registrations.map(r => r.studentId.toString()))];
      
      if (studentIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Students fetched successfully',
          data: {
            students: [],
            total: 0,
          },
        });
      }
      
      studentQuery = { _id: { $in: studentIds } };
    }
    
    const students = await Student.find(studentQuery)
      .populate('userId', 'firstName middleName lastName email isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        select: 'companyName',
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

    // Get registration count and service names for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const registrations = await StudentServiceRegistration.find({
          studentId: student._id,
        }).populate('serviceId', 'name');

        const serviceNames = registrations
          .map((r: any) => r.serviceId?.name)
          .filter(Boolean);

        return {
          _id: student._id,
          user: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          counselorId: student.counselorId,
          registrationCount: registrations.length,
          serviceNames,
          createdAt: student.createdAt,
        };
      })
    );

    // Count registrations without appropriate role assignment (only for SUPER_ADMIN)
    let pendingOpsAssignments = 0;
    const pendingStudentIds: string[] = [];
    if (userRole === USER_ROLE.SUPER_ADMIN) {
      // Get all registrations with their service info
      const allRegistrations = await StudentServiceRegistration.find({})
        .populate('serviceId', 'name slug');

      for (const registration of allRegistrations) {
        const service = registration.serviceId as any;
        if (!service) continue;

        const serviceName = service.name;
        let isPending = false;

        // Study Abroad -> needs OPS role (check primaryOpsId/activeOpsId)
        if (serviceName === 'Study Abroad') {
          isPending = !registration.primaryOpsId && !registration.activeOpsId;
        }
        // Ivy League Preparation -> needs IVY_EXPERT role (check primaryIvyExpertId/activeIvyExpertId)
        else if (serviceName === 'Ivy League Preparation') {
          isPending = !registration.primaryIvyExpertId && !registration.activeIvyExpertId;
        }
        // Education Planning -> needs EDUPLAN_COACH role (check primaryEduplanCoachId/activeEduplanCoachId)
        else if (serviceName === 'Education Planning') {
          isPending = !registration.primaryEduplanCoachId && !registration.activeEduplanCoachId;
        }

        if (isPending) {
          pendingOpsAssignments++;
          const studentIdStr = registration.studentId.toString();
          if (!pendingStudentIds.includes(studentIdStr)) {
            pendingStudentIds.push(studentIdStr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: {
        students: studentsWithStats,
        total: studentsWithStats.length,
        pendingOpsAssignments: pendingOpsAssignments,
        pendingStudentIds: pendingStudentIds,
      },
    });
  } catch (error: any) {
    console.error('Get all students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
};

/**
 * Get student details with all registrations
 * For ops: only show details if they are active OPS for at least one registration
 */
export const getStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    const student = await Student.findById(studentId)
      .populate('userId', 'firstName middleName lastName email role isVerified isActive createdAt')
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
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const registrations = await StudentServiceRegistration.find({
      studentId: student._id,
    })
      .populate('serviceId', 'name slug shortDescription icon')
      .populate({
        path: 'primaryOpsId',
        select: 'userId email specializations',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'secondaryOpsId',
        select: 'userId email specializations',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'activeOpsId',
        select: 'userId email specializations',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'primaryIvyExpertId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'secondaryIvyExpertId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName name email' }
      })
      .populate({
        path: 'activeIvyExpertId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .populate({
        path: 'primaryEduplanCoachId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .populate({
        path: 'secondaryEduplanCoachId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .populate({
        path: 'activeEduplanCoachId',
        select: 'userId email',
        populate: { path: 'userId', select: 'firstName middleName lastName email' }
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // If user is OPS, verify they are active OPS for at least one registration
    if (user?.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });

      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }

      const hasAccess = registrations.some(reg => {
        // Handle both populated (document) and unpopulated (ObjectId) OPS references
        const activeOpsIdValue = reg.activeOpsId || reg.primaryOpsId;
        const activeOpsIdString = activeOpsIdValue?._id?.toString() || activeOpsIdValue?.toString();
        return activeOpsIdString === ops._id.toString();
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active OPS for this student.',
        });
      }
    }

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
 * Get student form answers for a specific registration
 * For ops: only allow access if they are the active OPS
 */
export const getStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId,
    })
      .populate('serviceId', 'name')
      .populate('activeOpsId')
      .lean()
      .exec();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // If user is OPS, verify they are the active OPS for this registration
    if (user?.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId }).lean().exec();
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }

      // Get the full registration with populated fields to check access
      const fullRegistration = await StudentServiceRegistration.findById(registrationId)
        .populate('primaryOpsId')
        .populate('activeOpsId')
        .lean()
        .exec();
      
      // Handle both populated (document) and unpopulated (ObjectId) OPS references
      const activeOpsIdValue = fullRegistration?.activeOpsId || fullRegistration?.primaryOpsId;
      const activeOpsIdString = activeOpsIdValue?._id?.toString() || activeOpsIdValue?.toString();
      
      if (activeOpsIdString !== ops._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active OPS for this registration.',
        });
      }
    }

    // Get all form answers for this student (optimized with lean)
    const answers = await StudentFormAnswer.find({
      studentId,
    })
      .sort({ lastSavedAt: -1 })
      .lean()
      .exec();

    // Get student record to include mobileNumber (optimized with lean)
    const student = await Student.findById(studentId).lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Form answers fetched successfully',
      data: {
        registration,
        answers,
        student: student ? {
          mobileNumber: student.mobileNumber,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get student form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form answers',
      error: error.message,
    });
  }
};

/**
 * Update student form answers (admin/OPS can edit)
 */
export const updateStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, partKey } = req.params;
    const { answers } = req.body;

    // Find or create the answer document
    let answerDoc = await StudentFormAnswer.findOne({
      studentId,
      partKey,
    });

    if (answerDoc) {
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      answerDoc = await StudentFormAnswer.create({
        studentId,
        partKey,
        answers,
        lastSavedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Form answers updated successfully',
      data: { answerDoc },
    });
  } catch (error: any) {
    console.error('Update student form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update form answers',
      error: error.message,
    });
  }
};

/**
 * Get all students with service registrations (for dropdown/selection)
 */
export const getStudentsWithRegistrations = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceId } = req.query;

    let query: any = {};
    if (serviceId) {
      // Get students registered for a specific service
      const registrations = await StudentServiceRegistration.find({ serviceId }).select('studentId');
      const studentIds = registrations.map((r) => r.studentId);
      query = { _id: { $in: studentIds } };
    }

    const students = await Student.find(query)
      .populate('userId', 'firstName middleName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: { students },
    });
  } catch (error: any) {
    console.error('Get students with registrations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
};

/**
 * Assign role (OPS/IvyExpert/EduplanCoach) to a student service registration
 * Based on service type:
 * - Study Abroad -> OPS
 * - Ivy League Preparation -> IVY_EXPERT
 * - Education Planning -> EDUPLAN_COACH
 */
export const assignOps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { primaryOpsId, secondaryOpsId, primaryIvyExpertId, secondaryIvyExpertId, primaryEduplanCoachId, secondaryEduplanCoachId } = req.body;

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug');
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const service = registration.serviceId as any;
    const serviceName = service?.name;

    // Handle Study Abroad service -> OPS role
    if (serviceName === 'Study Abroad') {
      if (!primaryOpsId && !secondaryOpsId) {
        return res.status(400).json({
          success: false,
          message: 'At least one OPS ID is required for Study Abroad service',
        });
      }

      if (primaryOpsId) {
        const primaryOps = await Ops.findById(primaryOpsId);
        if (!primaryOps) {
          return res.status(404).json({
            success: false,
            message: 'Primary OPS not found',
          });
        }
        registration.primaryOpsId = primaryOpsId;
        if (!registration.activeOpsId) {
          registration.activeOpsId = primaryOpsId;
        }
      }

      if (secondaryOpsId) {
        const secondaryOps = await Ops.findById(secondaryOpsId);
        if (!secondaryOps) {
          return res.status(404).json({
            success: false,
            message: 'Secondary OPS not found',
          });
        }
        registration.secondaryOpsId = secondaryOpsId;
      }
    }
    // Handle Ivy League Preparation service -> IVY_EXPERT role
    else if (serviceName === 'Ivy League Preparation') {
      if (!primaryIvyExpertId && !secondaryIvyExpertId) {
        return res.status(400).json({
          success: false,
          message: 'At least one Ivy Expert ID is required for Ivy League service',
        });
      }

      if (primaryIvyExpertId) {
        const primaryIvyExpert = await IvyExpert.findById(primaryIvyExpertId);
        if (!primaryIvyExpert) {
          return res.status(404).json({
            success: false,
            message: 'Primary Ivy Expert not found',
          });
        }
        registration.primaryIvyExpertId = primaryIvyExpertId;
        if (!registration.activeIvyExpertId) {
          registration.activeIvyExpertId = primaryIvyExpertId;
        }
      }

      if (secondaryIvyExpertId) {
        const secondaryIvyExpert = await IvyExpert.findById(secondaryIvyExpertId);
        if (!secondaryIvyExpert) {
          return res.status(404).json({
            success: false,
            message: 'Secondary Ivy Expert not found',
          });
        }
        registration.secondaryIvyExpertId = secondaryIvyExpertId;
      }
    }
    // Handle Education Planning service -> EDUPLAN_COACH role
    else if (serviceName === 'Education Planning') {
      if (!primaryEduplanCoachId && !secondaryEduplanCoachId) {
        return res.status(400).json({
          success: false,
          message: 'At least one Eduplan Coach ID is required for Education Planning service',
        });
      }

      if (primaryEduplanCoachId) {
        const primaryEduplanCoach = await EduplanCoach.findById(primaryEduplanCoachId);
        if (!primaryEduplanCoach) {
          return res.status(404).json({
            success: false,
            message: 'Primary Eduplan Coach not found',
          });
        }
        registration.primaryEduplanCoachId = primaryEduplanCoachId;
        if (!registration.activeEduplanCoachId) {
          registration.activeEduplanCoachId = primaryEduplanCoachId;
        }
      }

      if (secondaryEduplanCoachId) {
        const secondaryEduplanCoach = await EduplanCoach.findById(secondaryEduplanCoachId);
        if (!secondaryEduplanCoach) {
          return res.status(404).json({
            success: false,
            message: 'Secondary Eduplan Coach not found',
          });
        }
        registration.secondaryEduplanCoachId = secondaryEduplanCoachId;
      }
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Unknown service type for role assignment',
      });
    }

    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryOpsId')
      .populate('secondaryOpsId')
      .populate('activeOpsId')
      .populate('primaryIvyExpertId')
      .populate('secondaryIvyExpertId')
      .populate('activeIvyExpertId')
      .populate('primaryEduplanCoachId')
      .populate('secondaryEduplanCoachId')
      .populate('activeEduplanCoachId');

    return res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Assign role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign role',
      error: error.message,
    });
  }
};

/**
 * Switch active role between primary and secondary
 * Works for OPS, IvyExpert, and EduplanCoach based on service type
 */
export const switchActiveOps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { activeOpsId, activeIvyExpertId, activeEduplanCoachId } = req.body;

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug');
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const service = registration.serviceId as any;
    const serviceName = service?.name;

    // Handle Study Abroad service -> OPS role
    if (serviceName === 'Study Abroad') {
      if (!activeOpsId) {
        return res.status(400).json({
          success: false,
          message: 'Active OPS ID is required',
        });
      }

      const isPrimary = registration.primaryOpsId?.toString() === activeOpsId;
      const isSecondary = registration.secondaryOpsId?.toString() === activeOpsId;

      if (!isPrimary && !isSecondary) {
        return res.status(400).json({
          success: false,
          message: 'Selected OPS must be either primary or secondary OPS',
        });
      }

      registration.activeOpsId = activeOpsId;
    }
    // Handle Ivy League Preparation service -> IVY_EXPERT role
    else if (serviceName === 'Ivy League Preparation') {
      if (!activeIvyExpertId) {
        return res.status(400).json({
          success: false,
          message: 'Active Ivy Expert ID is required',
        });
      }

      const isPrimary = registration.primaryIvyExpertId?.toString() === activeIvyExpertId;
      const isSecondary = registration.secondaryIvyExpertId?.toString() === activeIvyExpertId;

      if (!isPrimary && !isSecondary) {
        return res.status(400).json({
          success: false,
          message: 'Selected Ivy Expert must be either primary or secondary',
        });
      }

      registration.activeIvyExpertId = activeIvyExpertId;
    }
    // Handle Education Planning service -> EDUPLAN_COACH role
    else if (serviceName === 'Education Planning') {
      if (!activeEduplanCoachId) {
        return res.status(400).json({
          success: false,
          message: 'Active Eduplan Coach ID is required',
        });
      }

      const isPrimary = registration.primaryEduplanCoachId?.toString() === activeEduplanCoachId;
      const isSecondary = registration.secondaryEduplanCoachId?.toString() === activeEduplanCoachId;

      if (!isPrimary && !isSecondary) {
        return res.status(400).json({
          success: false,
          message: 'Selected Eduplan Coach must be either primary or secondary',
        });
      }

      registration.activeEduplanCoachId = activeEduplanCoachId;
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Unknown service type',
      });
    }

    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryOpsId')
      .populate('secondaryOpsId')
      .populate('activeOpsId')
      .populate('primaryIvyExpertId')
      .populate('secondaryIvyExpertId')
      .populate('activeIvyExpertId')
      .populate('primaryEduplanCoachId')
      .populate('secondaryEduplanCoachId')
      .populate('activeEduplanCoachId');

    return res.status(200).json({
      success: true,
      message: 'Active role switched successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Switch active role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch active role',
    });
  }
};


