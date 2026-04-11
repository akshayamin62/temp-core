import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Ops from '../models/Ops';
import IvyExpert from '../models/IvyExpert';
import EduplanCoach from '../models/EduplanCoach';
import { sendCustomMessageToStudent } from '../utils/email';
import { sendStaffMessageSms } from '../utils/sms';
// import Admin from '../models/Admin';
// import Counselor from '../models/Counselor';
import StudentServiceRegistration, { ServiceRegistrationStatus } from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import { USER_ROLE } from '../types/roles';
import { syncParentsFromFormAnswers } from '../utils/parentSync';

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

    // If user is an Eduplan Coach, filter by active assignments only
    if (userRole === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId });
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Eduplan Coach record not found',
        });
      }
      
      const registrations = await StudentServiceRegistration.find({
        $or: [
          { activeEduplanCoachId: coach._id },
          { activeEduplanCoachId: { $exists: false }, primaryEduplanCoachId: coach._id },
          { activeEduplanCoachId: null, primaryEduplanCoachId: coach._id }
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

    // If user is an Ivy Expert, filter by active assignments only
    if (userRole === USER_ROLE.IVY_EXPERT) {
      const ivyExpert = await IvyExpert.findOne({ userId });
      if (!ivyExpert) {
        return res.status(404).json({
          success: false,
          message: 'Ivy Expert record not found',
        });
      }

      const registrations = await StudentServiceRegistration.find({
        $or: [
          { activeIvyExpertId: ivyExpert._id },
          { activeIvyExpertId: { $exists: false }, primaryIvyExpertId: ivyExpert._id },
          { activeIvyExpertId: null, primaryIvyExpertId: ivyExpert._id }
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
      .populate('userId', 'firstName middleName lastName email profilePicture isVerified isActive createdAt')
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

        const serviceNames = [...new Set(
          registrations
            .map((r: any) => r.serviceId?.name)
            .filter(Boolean)
        )];

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
      .populate('userId', 'firstName middleName lastName email role profilePicture isVerified isActive createdAt')
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
      .populate({
        path: 'referrerId',
        populate: {
          path: 'userId',
          select: 'firstName middleName lastName'
        }
      })
      .populate({
        path: 'advisoryId',
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

    // If user is EDUPLAN_COACH, verify they are active coach for at least one registration
    if (user?.role === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId });

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Eduplan Coach record not found',
        });
      }

      const hasAccess = registrations.some(reg => {
        const activeCoachIdValue = reg.activeEduplanCoachId || reg.primaryEduplanCoachId;
        const activeCoachIdString = activeCoachIdValue?._id?.toString() || activeCoachIdValue?.toString();
        return activeCoachIdString === coach._id.toString();
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Eduplan Coach for this student.',
        });
      }
    }

    // If user is IVY_EXPERT, verify they are active ivy expert for at least one registration
    if (user?.role === USER_ROLE.IVY_EXPERT) {
      const ivyExpert = await IvyExpert.findOne({ userId });

      if (!ivyExpert) {
        return res.status(404).json({
          success: false,
          message: 'Ivy Expert record not found',
        });
      }

      const hasAccess = registrations.some(reg => {
        const activeIvyExpertIdValue = reg.activeIvyExpertId || reg.primaryIvyExpertId;
        const activeIvyExpertIdString = activeIvyExpertIdValue?._id?.toString() || activeIvyExpertIdValue?.toString();
        return activeIvyExpertIdString === ivyExpert._id.toString();
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Ivy Expert for this student.',
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
      .populate('serviceId', 'name slug')
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

    // If user is EDUPLAN_COACH, verify they are the active coach for this registration
    if (user?.role === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId }).lean().exec();
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Eduplan Coach record not found',
        });
      }

      const fullRegistration = await StudentServiceRegistration.findById(registrationId)
        .populate('primaryEduplanCoachId')
        .populate('activeEduplanCoachId')
        .lean()
        .exec();
      
      const activeCoachIdValue = fullRegistration?.activeEduplanCoachId || fullRegistration?.primaryEduplanCoachId;
      const activeCoachIdString = activeCoachIdValue?._id?.toString() || activeCoachIdValue?.toString();
      
      if (activeCoachIdString !== coach._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Eduplan Coach for this registration.',
        });
      }
    }

    // If user is IVY_EXPERT, verify they are the active ivy expert for this registration
    if (user?.role === USER_ROLE.IVY_EXPERT) {
      const ivyExpert = await IvyExpert.findOne({ userId }).lean().exec();
      if (!ivyExpert) {
        return res.status(404).json({
          success: false,
          message: 'Ivy Expert record not found',
        });
      }

      const fullRegistration = await StudentServiceRegistration.findById(registrationId)
        .populate('primaryIvyExpertId')
        .populate('activeIvyExpertId')
        .lean()
        .exec();

      const activeIvyExpertIdValue = fullRegistration?.activeIvyExpertId || fullRegistration?.primaryIvyExpertId;
      const activeIvyExpertIdString = activeIvyExpertIdValue?._id?.toString() || activeIvyExpertIdValue?.toString();

      if (activeIvyExpertIdString !== ivyExpert._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Ivy Expert for this registration.',
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
    const callerRole = req.user?.role;

    // Guard name fields for ALL roles, and parental entries for non-super-admin
    if (partKey === 'PROFILE' && answers) {
      const existingAnswer = await StudentFormAnswer.findOne({ studentId, partKey: 'PROFILE' });
      if (existingAnswer?.answers) {
        // Guard name fields (firstName, middleName, lastName) for ALL roles
        const existingPI = existingAnswer.answers?.personalDetails?.personalInformation;
        const incomingPI = answers?.personalDetails?.personalInformation;
        if (existingPI?.[0] && incomingPI) {
          if (!incomingPI[0]) incomingPI[0] = {};
          for (const field of ['firstName', 'middleName', 'lastName']) {
            if (existingPI[0][field] !== undefined) {
              incomingPI[0][field] = existingPI[0][field];
            }
          }
        }
        // Guard parental entries for non-super-admin
        if (callerRole !== USER_ROLE.SUPER_ADMIN) {
          const existingPG = existingAnswer.answers?.parentalDetails?.parentGuardian;
          const incomingPG = answers?.parentalDetails?.parentGuardian;
          if (Array.isArray(existingPG) && Array.isArray(incomingPG)) {
            const merged: any[] = [];
            for (let i = 0; i < Math.max(existingPG.length, incomingPG.length); i++) {
              const existing = existingPG[i];
              const hasFilled = existing && Object.values(existing).some((v: any) => v && String(v).trim() !== '');
              if (hasFilled) merged.push(existing);
              else if (incomingPG[i]) merged.push(incomingPG[i]);
            }
            if (!answers.parentalDetails) answers.parentalDetails = {};
            answers.parentalDetails.parentGuardian = merged.slice(0, 2);
          }
        }
      }
    }

    // Extract phone number from PROFILE answers
    if (partKey === 'PROFILE' && answers) {
      const pi = answers?.personalDetails?.personalInformation;
      if (Array.isArray(pi) && pi[0]) {
        const phone = pi[0].phoneNumber || pi[0].mobileNumber || pi[0].phone;
        if (phone && String(phone).trim()) {
          const student = await Student.findById(studentId);
          if (student) {
            student.mobileNumber = String(phone).trim();
            await student.save();
          }
        }
      }
    }

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

    // Sync parent records when PROFILE part is saved
    if (partKey === 'PROFILE') {
      const parentEntries = answerDoc.answers?.parentalDetails?.parentGuardian;
      if (Array.isArray(parentEntries) && parentEntries.length > 0) {
        await syncParentsFromFormAnswers(studentId, parentEntries);
      }
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
      .populate('userId', 'firstName middleName lastName email profilePicture')
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

/**
 * Send a custom message email to a student
 */
export const sendMessageToStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { studentId } = req.params;
    const { message, serviceName, sendVia } = req.body;
    // sendVia: 'email' | 'sms' | 'both' (default: 'email')
    const channel: string = sendVia || 'email';

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Get sender info
    const sender = await User.findById(userId).select('firstName middleName lastName role');
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found',
      });
    }

    // Get student info with user details
    const student = await Student.findById(studentId)
      .populate('userId', 'firstName middleName lastName email profilePicture');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentUser = student.userId as any;
    if (!studentUser?.email && (channel === 'email' || channel === 'both')) {
      return res.status(400).json({
        success: false,
        message: 'Student email not found',
      });
    }

    const senderName = [sender.firstName, sender.middleName, sender.lastName].filter(Boolean).join(' ');
    const studentName = [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ') || 'Student';

    // Map role to display name
    const roleDisplayMap: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      COUNSELOR: 'Counselor',
      OPS: 'OPS',
      EDUPLAN_COACH: 'Education Planning Coach',
    };
    const senderRole = roleDisplayMap[sender.role] || sender.role;

    const results: string[] = [];

    // Send Email
    if (channel === 'email' || channel === 'both') {
      await sendCustomMessageToStudent(
        studentUser.email,
        studentName,
        senderName,
        senderRole,
        message.trim(),
        serviceName
      );
      results.push('Email sent');
    }

    // Send SMS
    if (channel === 'sms' || channel === 'both') {
      const mobile = student.mobileNumber;
      if (!mobile) {
        if (channel === 'sms') {
          return res.status(400).json({
            success: false,
            message: 'Student mobile number not found',
          });
        }
        // If 'both', email already sent, just note SMS was skipped
        results.push('SMS skipped (no mobile number)');
      } else {
        try {
          await sendStaffMessageSms({ mobile, senderName, senderRole, serviceName: serviceName || 'CORE Platform' });
          results.push('SMS sent');
        } catch (smsErr: any) {
          console.error('SMS send error:', smsErr?.message || smsErr);
          if (channel === 'sms') {
            return res.status(500).json({
              success: false,
              message: 'Failed to send SMS',
            });
          }
          results.push('SMS failed');
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: results.join(', '),
    });
  } catch (error: any) {
    console.error('Send message to student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

/**
 * Update the status of a StudentServiceRegistration
 * Role-based access:
 *   - SUPER_ADMIN: can update status for all services
 *   - OPS: can update status only for Study Abroad services
 *   - EDUPLAN_COACH: can update status only for Education Planning services
 *   - IVY_EXPERT: can update status only for Ivy Expert services
 */
export const updateRegistrationStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role as USER_ROLE;

    // Validate status value
    const allowedStatuses = [
      ServiceRegistrationStatus.REGISTERED,
      ServiceRegistrationStatus.IN_PROGRESS,
      ServiceRegistrationStatus.COMPLETED,
      ServiceRegistrationStatus.CANCELLED,
    ];

    if (!status || !allowedStatuses.includes(status as ServiceRegistrationStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    // Find the registration and populate serviceId
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

    // Role-based permission check
    if (userRole === USER_ROLE.OPS) {
      // OPS can only update Study Abroad services
      if (serviceName !== 'Study Abroad') {
        return res.status(403).json({
          success: false,
          message: 'OPS can only update status for Study Abroad services.',
        });
      }

      // Verify OPS is assigned to this registration
      const ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }
      const activeOpsIdValue = registration.activeOpsId || registration.primaryOpsId;
      const activeOpsIdString = activeOpsIdValue?.toString();
      if (activeOpsIdString !== ops._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active OPS for this registration.',
        });
      }
    } else if (userRole === USER_ROLE.EDUPLAN_COACH) {
      // Eduplan Coach can only update Education Planning services
      if (serviceName !== 'Education Planning') {
        return res.status(403).json({
          success: false,
          message: 'Eduplan Coach can only update status for Education Planning services.',
        });
      }

      // Verify coach is assigned to this registration
      const coach = await EduplanCoach.findOne({ userId });
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Eduplan Coach record not found',
        });
      }
      const activeCoachIdValue = registration.activeEduplanCoachId || registration.primaryEduplanCoachId;
      const activeCoachIdString = activeCoachIdValue?.toString();
      if (activeCoachIdString !== coach._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Eduplan Coach for this registration.',
        });
      }
    } else if (userRole === USER_ROLE.IVY_EXPERT) {
      // Ivy Expert can only update Ivy League services
      if (serviceName !== 'Ivy League Preparation' && serviceName !== 'Ivy League Admissions') {
        return res.status(403).json({
          success: false,
          message: 'Ivy Expert can only update status for Ivy League services.',
        });
      }

      // Verify ivy expert is assigned to this registration
      const ivyExpert = await IvyExpert.findOne({ userId });
      if (!ivyExpert) {
        return res.status(404).json({
          success: false,
          message: 'Ivy Expert record not found',
        });
      }
      const activeIvyExpertIdValue = registration.activeIvyExpertId || registration.primaryIvyExpertId;
      const activeIvyExpertIdString = activeIvyExpertIdValue?.toString();
      if (activeIvyExpertIdString !== ivyExpert._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Ivy Expert for this registration.',
        });
      }
    } else if (userRole !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update registration status.',
      });
    }

    // Update the status
    registration.status = status as ServiceRegistrationStatus;

    // Set timestamp fields based on status
    if (status === ServiceRegistrationStatus.COMPLETED) {
      registration.completedAt = new Date();
      registration.cancelledAt = undefined;
    } else if (status === ServiceRegistrationStatus.CANCELLED) {
      registration.cancelledAt = new Date();
      registration.completedAt = undefined;
    } else {
      // IN_PROGRESS - clear completion/cancellation timestamps
      registration.completedAt = undefined;
      registration.cancelledAt = undefined;
    }

    await registration.save();

    return res.status(200).json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: {
        registration: {
          _id: registration._id,
          status: registration.status,
          completedAt: registration.completedAt,
          cancelledAt: registration.cancelledAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Update registration status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update registration status',
    });
  }
};

