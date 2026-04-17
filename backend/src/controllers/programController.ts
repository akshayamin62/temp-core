import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Program, { PROGRAM_STATUS } from '../models/Program';
import Ops from '../models/Ops';
import Student from '../models/Student';
import { USER_ROLE } from '../types/roles';
import User from '../models/User';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import OpsSchedule, { OPS_SCHEDULE_STATUS } from '../models/OpsSchedule';
import * as XLSX from 'xlsx';
import { getQsRanking, clearQsRankingCache, getQsData } from '../utils/qsRankingLookup';
import {
  sendWhatsAppProgramAdded,
  sendWhatsAppProgramStatusUpdate,
  sendWhatsAppStudentSelectedProgram,
  sendWhatsAppOfferReceived,
} from '../utils/whatsapp';
import {
  sendProgramSuggestedEmail,
  sendStudentSelectedProgramEmail,
  sendProgramStatusUpdateEmail,
  sendOfferReceivedEmail,
} from '../utils/email';

/**
 * Helper: get full name from a User document
 */
const getFullName = (user: any): string => {
  return [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') || 'Student';
};

/**
 * Get all programs for a student (added by their assigned OPS)
 */
export const getStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get all programs made for this student by any OPS
    // Show all programs where studentId matches, regardless of which OPS created them
    const { registrationId } = req.query;
    
    const baseQuery: any = {
      $or: [
        { studentId: student._id }, // Programs specifically for this student
        { studentId: null }, // General programs (not linked to any student)
        { studentId: { $exists: false } }, // Programs without studentId field
      ],
    };
    
    // If registrationId is provided, also filter by it
    if (registrationId) {
      baseQuery.registrationId = registrationId;
    }
    
    const allPrograms = await Program.find(baseQuery)
      .populate({
        path: 'createdBy',
        select: 'firstName middleName lastName email role'
      })
      .sort({ createdAt: -1 });

    // Separate available and applied programs
    const availablePrograms = allPrograms.filter(p => !p.isSelectedByStudent || p.studentId?.toString() !== student._id.toString());
    const appliedPrograms = allPrograms
      .filter(p => p.isSelectedByStudent && p.studentId?.toString() === student._id.toString())
      .sort((a, b) => {
        // Sort by priority first, then by selectedAt
        if (a.priority !== b.priority) {
          return (a.priority || 0) - (b.priority || 0);
        }
        return (a.selectedAt?.getTime() || 0) - (b.selectedAt?.getTime() || 0);
      });

    return res.status(200).json({
      success: true,
      message: 'Programs fetched successfully',
      data: {
        availablePrograms,
        appliedPrograms,
      },
    });
  } catch (error: any) {
    console.error('Get student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
    });
  }
};

/**
 * Get programs for a specific student (Ops view)
 */
export const getOpsStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    // Allow OPS, ADMIN, COUNSELOR, SUPER_ADMIN, PARENT, EDUPLAN_COACH, IVY_EXPERT, REFERRER, ADVISOR roles
    const allowedRoles = [USER_ROLE.OPS, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.PARENT, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT, USER_ROLE.REFERRER, USER_ROLE.ADVISOR];
    if (!user || !allowedRoles.includes(user.role as any)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // OPS role verification (skip for ADMIN/COUNSELOR who are read-only)
    if (user.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'Ops record not found',
        });
      }
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs for this student from ANY OPS (not just this OPS)
    // If section is "Applied Program", only return programs selected by the student
    // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
    const { section, registrationId } = req.query;
    
    // If requesting applied programs, only show selected ones
    if (section === 'applied') {
      const query: any = {
        studentId: studentId,
        isSelectedByStudent: true,
      };
      if (registrationId) {
        query.registrationId = registrationId;
      }
      const programs = await Program.find(query)
        .populate({
          path: 'createdBy',
          select: 'firstName middleName lastName email role'
        })
        .sort({ priority: 1, selectedAt: 1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    } else {
      // For "Apply to Program", show only programs that are NOT selected
      // $ne: true will match false, null, and undefined (since default is false)
      const query: any = {
        studentId: studentId,
        isSelectedByStudent: { $ne: true },
      };
      if (registrationId) {
        query.registrationId = registrationId;
      }
      const programs = await Program.find(query)
        .populate({
          path: 'createdBy',
          select: 'firstName middleName lastName email role'
        })
        .sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    }
  } catch (error: any) {
    console.error('Get OPS student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
    });
  }
};

/**
 * Get all programs for a OPS
 */
export const getOpsPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.OPS) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: 'Ops record not found',
      });
    }

    const programs = await Program.find({ opsId: ops._id })
      .populate('studentId', 'userId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Programs fetched successfully',
      data: { programs },
    });
  } catch (error: any) {
    console.error('Get OPS programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
    });
  }
};

/**
 * Create a new program (OPS)
 */
export const createProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.OPS && user?.role !== USER_ROLE.STUDENT && user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const {
      studentId, // Optional for OPS/admin: if provided, link program to specific student
      registrationId, // Optional: link program to a specific service registration
      university,
      universityRanking,
      programName,
      programUrl,
      campus,
      country,
      studyLevel,
      duration,
      ieltsScore,
      applicationFee,
      yearlyTuitionFees,
    } = req.body;

    // Validate required fields (only 5 fields are required)
    if (!university || !programName || !programUrl || !country || !studyLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: University, Program Name, Program Link, Country, and Study Level are required',
      });
    }

    let opsObjectId;
    let studentObjectId;

    // Handle different user roles
    if (user.role === USER_ROLE.STUDENT) {
      // Student creates program for themselves
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student record not found',
        });
      }
      studentObjectId = student._id;
      // No opsId for student-created programs
      opsObjectId = null;
    } else if (user.role === USER_ROLE.OPS) {
      // Ops creates program
      const ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'Ops record not found',
        });
      }
      opsObjectId = ops._id;
      
      // If studentId is provided, validate it exists
      if (studentId) {
        const student = await Student.findById(studentId);
        if (!student) {
          return res.status(404).json({
            success: false,
            message: 'Student not found',
          });
        }
        studentObjectId = student._id;
      }
    } else if (user.role === USER_ROLE.SUPER_ADMIN) {
      // Admin creates program - must provide studentId
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required for admin',
        });
      }
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }
      studentObjectId = student._id;
      // No opsId for admin-created programs
      opsObjectId = null;
    }

    // Auto-populate QS ranking and university status if not provided
    const finalRanking = universityRanking || {};
    let universityStatusValue: string | undefined;
    if (university) {
      const qsData = getQsData(university);
      if (qsData) {
        if (!finalRanking.qs) {
          finalRanking.qs = qsData.rank;
        }
        if (qsData.status) {
          universityStatusValue = qsData.status;
        }
      }
    }

    const program = await Program.create({
      createdBy: userId,
      opsId: opsObjectId,
      studentId: studentObjectId, // Link to specific student if provided
      registrationId: registrationId || undefined,
      university,
      universityRanking: finalRanking,
      universityStatus: universityStatusValue,
      programName,
      programUrl,
      campus,
      country,
      studyLevel,
      duration,
      ieltsScore,
      applicationFee,
      yearlyTuitionFees,
      isSelectedByStudent: false,
    });

    // Send WhatsApp + Email notification to student when OPS/Super Admin creates a program
    if (studentObjectId && (user.role === USER_ROLE.OPS || user.role === USER_ROLE.SUPER_ADMIN)) {
      try {
        const student = await Student.findById(studentObjectId).populate('userId', 'firstName middleName lastName email');
        if (student) {
          const studentUser = student.userId as any;
          const studentName = getFullName(studentUser);
          const universityWithCountry = `${university} - ${country}`;

          // WhatsApp to student
          if (student.mobileNumber) {
            sendWhatsAppProgramAdded(student.mobileNumber, studentName, programName, universityWithCountry).catch(err =>
              console.error('WhatsApp program added notification failed:', err.message)
            );
          }

          // Email to student
          if (studentUser?.email) {
            sendProgramSuggestedEmail(studentUser.email, studentName, { programName, university, country }).catch(err =>
              console.error('Email program suggested notification failed:', err.message)
            );
          }
        }
      } catch (notifError: any) {
        console.error('Program creation notification failed:', notifError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Create program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create program',
    });
  }
};

/**
 * Student selects a program
 */
export const selectProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const { programId, priority, intake, year, registrationId } = req.body;

    if (!programId || priority === undefined || !intake || !year) {
      return res.status(400).json({
        success: false,
        message: 'Program ID, priority, intake, and year are required',
      });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    // Verify the program is made for this student (or is a general program)
    if (program.studentId && program.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This program is not available for you',
      });
    }

    program.studentId = student._id;
    program.priority = priority;
    program.intake = intake;
    program.year = year;
    program.selectedAt = new Date();
    program.isSelectedByStudent = true;
    program.status = PROGRAM_STATUS.SHORTLISTED;
    if (registrationId) {
      program.registrationId = registrationId;
    }
    await program.save();

    // Send WhatsApp + Email notification to OPS when student selects a program
    try {
      const studentUser = user; // Current user is the student
      const studentName = getFullName(studentUser);

      // Find the active OPS for this student's registration
      const regId = registrationId || program.registrationId;
      if (regId) {
        const registration = await StudentServiceRegistration.findById(regId);
        if (registration?.activeOpsId) {
          const opsRecord = await Ops.findById(registration.activeOpsId).populate('userId', 'firstName middleName lastName email');
          if (opsRecord) {
            const opsUser = opsRecord.userId as any;
            const opsName = getFullName(opsUser);

            // WhatsApp to OPS
            if (opsRecord.mobileNumber) {
              sendWhatsAppStudentSelectedProgram(opsRecord.mobileNumber, opsName, studentName, program.programName, program.university).catch(err =>
                console.error('WhatsApp student selected program notification failed:', err.message)
              );
            }

            // Email to OPS
            if (opsUser?.email) {
              sendStudentSelectedProgramEmail(opsUser.email, opsName, studentName, {
                programName: program.programName,
                university: program.university,
                priority,
              }).catch(err =>
                console.error('Email student selected program notification failed:', err.message)
              );
            }
          }
        }
      }
    } catch (notifError: any) {
      console.error('Program selection notification failed:', notifError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Program selected successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Select program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to select program',
    });
  }
};

/**
 * Student removes a program from applied list
 */
export const removeProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const { programId } = req.params;

    const program = await Program.findById(programId);
    if (!program || program.studentId?.toString() !== student._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or not selected by you',
      });
    }

    program.studentId = undefined;
    program.priority = undefined;
    program.intake = undefined;
    program.year = undefined;
    program.selectedAt = undefined;
    program.isSelectedByStudent = false;
    await program.save();

    return res.status(200).json({
      success: true,
      message: 'Program removed successfully',
    });
  } catch (error: any) {
    console.error('Remove program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove program',
    });
  }
};

/**
 * Admin updates program priority, intake, and year
 */
export const updateProgramSelection = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { programId } = req.params;
    const { priority, intake, year } = req.body;

    if (priority === undefined || !intake || !year) {
      return res.status(400).json({
        success: false,
        message: 'Priority, intake, and year are required',
      });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    program.priority = priority;
    program.intake = intake;
    program.year = year;
    await program.save();

    return res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Update program selection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update program',
    });
  }
};

/**
 * Update program application status (OPS and Super Admin only)
 */
export const updateProgramStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (!user || (user.role !== USER_ROLE.OPS && user.role !== USER_ROLE.SUPER_ADMIN)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only OPS and Super Admin can update program status.',
      });
    }

    const { programId } = req.params;
    const { status, applicationOpenDate, scheduleTime } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = Object.values(PROGRAM_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Validate applicationOpenDate if status is "Application not Open"
    if (status === PROGRAM_STATUS.APPLICATION_NOT_OPEN) {
      if (!applicationOpenDate) {
        return res.status(400).json({
          success: false,
          message: 'Application open date is required for "Application not Open" status',
        });
      }
      if (!scheduleTime) {
        return res.status(400).json({
          success: false,
          message: 'Schedule time is required for "Application not Open" status',
        });
      }
      // Validate time format HH:mm
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleTime)) {
        return res.status(400).json({
          success: false,
          message: 'Schedule time must be in HH:mm format',
        });
      }
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    program.status = status;

    // Handle applicationOpenDate
    if (status === PROGRAM_STATUS.APPLICATION_NOT_OPEN) {
      program.applicationOpenDate = new Date(applicationOpenDate);
    } else {
      // Clear applicationOpenDate if status changes away from "Application not Open"
      program.applicationOpenDate = undefined;
    }

    await program.save();

    // Auto-create OPS schedule when status is "Application not Open"
    if (status === PROGRAM_STATUS.APPLICATION_NOT_OPEN && program.studentId) {
      try {
        // Find OPS profile for the current user
        let opsProfile = await Ops.findOne({ userId: userId });

        // If the current user is SUPER_ADMIN, find the OPS assigned to this student
        if (!opsProfile && user.role === USER_ROLE.SUPER_ADMIN) {
          const registration = await StudentServiceRegistration.findOne({
            studentId: program.studentId,
          });
          if (registration?.activeOpsId) {
            opsProfile = await Ops.findById(registration.activeOpsId);
          }
        }

        if (opsProfile) {
          // Get student info for the description
          const student = await Student.findById(program.studentId).populate('userId', 'firstName middleName lastName');
          const studentUser = student?.userId as any;
          const studentName = studentUser
            ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ')
            : 'Student';

          const openDate = new Date(applicationOpenDate);
          const description = `Application Opens: ${program.programName} at ${program.university} for ${studentName}. Application start date: ${openDate.toLocaleDateString('en-GB')}.`;

          await OpsSchedule.create({
            opsId: opsProfile._id,
            studentId: program.studentId,
            scheduledDate: openDate,
            scheduledTime: scheduleTime,
            description,
            status: OPS_SCHEDULE_STATUS.SCHEDULED,
          });
        }
      } catch (scheduleError: any) {
        console.error('Failed to create auto OPS schedule:', scheduleError);
        // Don't fail the status update if schedule creation fails
      }
    }

    // Send WhatsApp + Email notification to student on status change
    if (program.studentId) {
      try {
        const student = await Student.findById(program.studentId).populate('userId', 'firstName middleName lastName email');
        if (student) {
          const studentUser = student.userId as any;
          const studentName = getFullName(studentUser);
          const programAtUniversity = `${program.programName} at ${program.university}`;

          if (status === PROGRAM_STATUS.OFFER_RECEIVED) {
            // Template 9: Offer Received — special celebration notification
            if (student.mobileNumber) {
              sendWhatsAppOfferReceived(student.mobileNumber, studentName, program.programName, program.university).catch(err =>
                console.error('WhatsApp offer received notification failed:', err.message)
              );
            }
            if (studentUser?.email) {
              sendOfferReceivedEmail(studentUser.email, studentName, {
                programName: program.programName,
                university: program.university,
                country: program.country,
              }).catch(err =>
                console.error('Email offer received notification failed:', err.message)
              );
            }
          } else {
            // Template 3: General program status update
            if (student.mobileNumber) {
              sendWhatsAppProgramStatusUpdate(student.mobileNumber, studentName, programAtUniversity, status).catch(err =>
                console.error('WhatsApp program status update notification failed:', err.message)
              );
            }
            if (studentUser?.email) {
              sendProgramStatusUpdateEmail(studentUser.email, studentName, {
                programName: program.programName,
                university: program.university,
                country: program.country,
                newStatus: status,
              }).catch(err =>
                console.error('Email program status update notification failed:', err.message)
              );
            }
          }
        }
      } catch (notifError: any) {
        console.error('Program status notification failed:', notifError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Program status updated successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Update program status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update program status',
    });
  }
};

/**
 * Get programs for a specific student (super admin view) - only filter by studentId, not opsId
 */
export const getSuperAdminStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs for this student (only filter by studentId, not opsId)
    // If section is "Applied Program", only return programs selected by the student
    // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
    const { section, registrationId } = req.query;
    
    // If requesting applied programs, only show selected ones
    if (section === 'applied') {
      const query: any = {
        studentId: studentId,
        isSelectedByStudent: true,
      };
      if (registrationId) {
        query.registrationId = registrationId;
      }
      const programs = await Program.find(query)
        .populate({
          path: 'createdBy',
          select: 'firstName middleName lastName email role'
        })
        .sort({ priority: 1, selectedAt: 1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    } else {
      // For "Apply to Program", show only programs that are NOT selected
      // $ne: true will match false, null, and undefined (since default is false)
      const query: any = {
        studentId: studentId,
        isSelectedByStudent: { $ne: true },
      };
      if (registrationId) {
        query.registrationId = registrationId;
      }
      const programs = await Program.find(query)
        .populate({
          path: 'createdBy',
          select: 'firstName middleName lastName email role'
        })
        .sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    }
  } catch (error: any) {
    console.error('Get admin student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
    });
  }
};

/**
 * Get applied programs for a student (admin view) - kept for backward compatibility
 */
export const getStudentAppliedPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs selected by this student
    const programs = await Program.find({
      studentId: studentId,
      isSelectedByStudent: true,
    })
      .populate({
        path: 'createdBy',
        select: 'firstName middleName lastName email role'
      })
      .sort({ priority: 1, selectedAt: 1 });

    return res.status(200).json({
      success: true,
      message: 'Applied programs fetched successfully',
      data: { programs },
    });
  } catch (error: any) {
    console.error('Get student applied programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applied programs',
    });
  }
};

/**
 * Upload programs from Excel file
 */
export const uploadProgramsFromExcel = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.OPS && user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get OPS record if user is OPS
    let ops = null;
    if (user.role === USER_ROLE.OPS) {
      ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const programs = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      try {
        // Map Excel columns to program fields
        // Expected columns: University, Program Name, Program Link (or Website URL), Campus, Country, Study Level, Duration, IELTS Score, Application Fee, Yearly Tuition Fees, Webometrics World, Webometrics National, US News, QS
        
        // Helper function to get value from row with multiple possible column names
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          return '';
        };

        const getNumber = (keys: string[], defaultValue: number = 0) => {
          const value = getValue(keys);
          if (value === '' || value === undefined || value === null) return defaultValue;
          // Handle string numbers with commas, currency symbols, or other formatting
          let cleanValue = String(value).replace(/,/g, '').replace(/£/g, '').replace(/\$/g, '').trim();
          // Remove any non-numeric characters except decimal point
          cleanValue = cleanValue.replace(/[^\d.]/g, '');
          const num = parseFloat(cleanValue);
          return isNaN(num) ? defaultValue : num;
        };

        const getInt = (keys: string[]) => {
          const value = getValue(keys);
          if (value === '' || value === undefined || value === null) return undefined;
          const num = typeof value === 'number' ? value : parseInt(String(value));
          return isNaN(num) ? undefined : num;
        };
        
        // Get studentId from request body if provided
        const studentId = req.body.studentId;

        // Validate studentId if provided
        let studentObjectId = undefined;
        if (studentId) {
          const student = await Student.findById(studentId);
          if (!student) {
            errors.push({
              row: i + 2,
              error: 'Student not found',
            });
            continue;
          }
          studentObjectId = student._id;
        }

        const programData: any = {
          createdBy: userId, // Track who created the program
          studentId: studentObjectId, // Link to specific student if provided
          registrationId: req.body.registrationId || undefined,
          university: getValue(['University', 'university', 'UNIVERSITY']),
          programName: getValue(['Program Name', 'programName', 'Program', 'program']),
          programUrl: getValue(['Program Link', 'programLink', 'Website URL', 'programUrl', 'Website', 'website', 'URL', 'url']),
          campus: getValue(['Campus', 'campus', 'CAMPUS']),
          country: getValue(['Country', 'country', 'COUNTRY']),
          studyLevel: getValue(['Study Level', 'studyLevel', 'Level', 'level']) || 'Postgraduate',
          duration: getNumber(['Duration', 'duration', 'DURATION'], 12),
          ieltsScore: getNumber(['IELTS Score', 'ieltsScore', 'IELTS', 'ielts'], 0),
          applicationFee: getValue(['Application Fee', 'applicationFee', 'Fee', 'fee']),
          yearlyTuitionFees: getValue(['Yearly Tuition Fees', 'yearlyTuitionFees', 'Tuition', 'tuition']),
          universityRanking: {
            webometricsWorld: getInt(['Webometrics World', 'webometricsWorld', 'Webometrics World Ranking']),
            webometricsNational: getInt(['Webometrics Continent', 'webometricsContinent', 'Webometrics National', 'webometricsNational', 'Webometrics National Ranking']),
            usNews: getInt(['US News', 'usNews', 'US News Ranking']),
            qs: getInt(['QS Ranking', 'QS', 'qs', 'qsRanking']),
          },
          isSelectedByStudent: false,
        };

        // Auto-populate QS ranking and university status if not provided in the Excel
        if (programData.university) {
          const qsData = getQsData(programData.university);
          if (qsData) {
            if (!programData.universityRanking.qs) {
              programData.universityRanking.qs = qsData.rank;
            }
            if (qsData.status) {
              programData.universityStatus = qsData.status;
            }
          }
        }

        // Validate required fields (only 5 fields are required)
        if (!programData.university || !programData.programName || !programData.programUrl || 
            !programData.country || !programData.studyLevel) {
          errors.push({
            row: i + 2, // +2 because Excel rows start at 1 and we have header
            error: 'Missing required fields: University, Program Name, Website URL, Country, and Study Level are required',
          });
          continue;
        }

        const program = await Program.create(programData);
        programs.push(program);
      } catch (error: any) {
        errors.push({
          row: i + 2 || 'Failed to create program',
        });
      }
    }

    // Send WhatsApp + Email notification to student after Excel upload (if student is linked)
    if (programs.length > 0 && req.body.studentId) {
      try {
        const student = await Student.findById(req.body.studentId).populate('userId', 'firstName middleName lastName email');
        if (student) {
          const studentUser = student.userId as any;
          const studentName = getFullName(studentUser);

          // Use the first program as the representative for the notification
          // The WhatsApp template mentions "a list of new programs has been suggested"
          const firstProgram = programs[0];
          const universityWithCountry = `${firstProgram.university} - ${firstProgram.country}`;
          const programLabel = programs.length > 1
            ? `${firstProgram.programName} and ${programs.length - 1} more program(s)`
            : firstProgram.programName;

          // WhatsApp to student (Template 2)
          if (student.mobileNumber) {
            sendWhatsAppProgramAdded(student.mobileNumber, studentName, programLabel, universityWithCountry).catch(err =>
              console.error('WhatsApp program added (excel) notification failed:', err.message)
            );
          }

          // Email to student
          if (studentUser?.email) {
            sendProgramSuggestedEmail(studentUser.email, studentName, {
              programName: programLabel,
              university: firstProgram.university,
              country: firstProgram.country,
            }).catch(err =>
              console.error('Email program suggested (excel) notification failed:', err.message)
            );
          }
        }
      } catch (notifError: any) {
        console.error('Excel upload notification failed:', notifError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${programs.length} programs${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: {
        imported: programs.length,
        errors: errors.length,
        errorDetails: errors,
      },
    });
  } catch (error: any) {
    console.error('Upload programs from Excel error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload programs from Excel',
    });
  }
};

/**
 * Upload QS World University Rankings Excel file (Super Admin only)
 * Replaces the existing QS ranking reference file
 */
export const uploadQsRankingExcel = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (user?.role !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can upload QS rankings.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Validate the Excel has expected structure
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 0 });

    if (rows.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QS ranking file. File appears to be empty or has insufficient data.',
      });
    }

    // Check that expected columns exist (row index 2 should have data with __EMPTY and __EMPTY_2)
    const sampleRow = rows[2];
    if (!sampleRow || sampleRow['__EMPTY'] === undefined || sampleRow['__EMPTY_2'] === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QS ranking file format. Expected columns for Rank and University Name not found.',
      });
    }

    // Save the file to backend/data/
    // Use process.cwd() so path works in both dev and production (compiled dist/)
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'qs-world-university-ranking.xlsx');

    // Ensure data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, req.file.buffer);

    // Clear the cached rankings so next lookup reloads from the new file
    clearQsRankingCache();

    // Count how many rankings were loaded
    let count = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (row['__EMPTY_2'] && row['__EMPTY']) count++;
    }

    return res.status(200).json({
      success: true,
      message: `QS ranking file uploaded successfully. ${count} university rankings loaded.`,
      data: { universitiesLoaded: count },
    });
  } catch (error: any) {
    console.error('Upload QS ranking Excel error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload QS ranking file',
    });
  }
};

/**
 * Delete an available (not selected by student) program — OPS and Super Admin only
 */
export const deleteAvailableProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user || (user.role !== USER_ROLE.SUPER_ADMIN && user.role !== USER_ROLE.OPS)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin and OPS can delete available programs.',
      });
    }

    const { programId } = req.params;

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    if (program.isSelectedByStudent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a program that has been selected by the student.',
      });
    }

    await Program.findByIdAndDelete(programId);

    return res.status(200).json({
      success: true,
      message: 'Program deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete available program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete program',
    });
  }
};


