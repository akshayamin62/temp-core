import { Response } from "express";
import StudentFormAnswer from "../models/StudentFormAnswer";
import Student from "../models/Student";
import StudentServiceRegistration, {
  ServiceRegistrationStatus,
} from "../models/StudentServiceRegistration";
import { AuthRequest } from "../types/auth";
import { USER_ROLE } from "../types/roles";
import { syncParentsFromFormAnswers } from "../utils/parentSync";
import {
  PROFILE_CONFIG,
  PROFILE_PAGE_SECTIONS,
} from "../config/formConfig";

// ─── Helpers ───

/** Extract phone from PROFILE answers → personalDetails.personalInformation[0].mobileNumber */
function extractPhoneFromAnswers(answers: any): string | null {
  const pi = answers?.personalDetails?.personalInformation;
  if (Array.isArray(pi) && pi[0]) {
    const v = pi[0].phoneNumber || pi[0].mobileNumber || pi[0].phone;
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

/** Sync parents from saved parentalDetails.parentGuardian entries */
async function syncParentsIfPresent(studentId: any, answers: any): Promise<void> {
  const parentEntries = answers?.parentalDetails?.parentGuardian;
  if (Array.isArray(parentEntries) && parentEntries.length > 0) {
    await syncParentsFromFormAnswers(studentId, parentEntries);
  }
}

/** Guard: preserve name fields (firstName, middleName, lastName) from existing answers */
function guardNameFields(existingAnswers: any, incomingAnswers: any) {
  const existingPI = existingAnswers?.personalDetails?.personalInformation;
  const incomingPI = incomingAnswers?.personalDetails?.personalInformation;
  if (existingPI?.[0] && incomingPI) {
    if (!incomingPI[0]) incomingPI[0] = {};
    for (const field of ['firstName', 'middleName', 'lastName']) {
      if (existingPI[0][field] !== undefined) {
        incomingPI[0][field] = existingPI[0][field];
      }
    }
  }
}

/** Guard: prevent student from editing already-filled parent entries (allow adding new up to 2) */
function guardParentEntries(existingAnswers: any, incomingAnswers: any) {
  const existingPG = existingAnswers?.parentalDetails?.parentGuardian;
  const incomingPG = incomingAnswers?.parentalDetails?.parentGuardian;
  if (!Array.isArray(existingPG) || !Array.isArray(incomingPG)) return;
  const merged: any[] = [];
  for (let i = 0; i < Math.max(existingPG.length, incomingPG.length); i++) {
    const existing = existingPG[i];
    const hasFilled = existing && Object.values(existing).some((v: any) => v && String(v).trim() !== "");
    if (hasFilled) {
      merged.push(existing);
    } else if (incomingPG[i]) {
      merged.push(incomingPG[i]);
    }
  }
  if (!incomingAnswers.parentalDetails) incomingAnswers.parentalDetails = {};
  incomingAnswers.parentalDetails.parentGuardian = merged.slice(0, 2);
}

// Save form answers (part-wise for reusability across services)
export const saveFormAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, partKey, answers } = req.body;
    const userId = req.user?.userId;

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId: student._id,
    });
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Extract phone number from PROFILE answers
    if (partKey === 'PROFILE' && answers) {
      const phone = extractPhoneFromAnswers(answers);
      if (phone) {
        student.mobileNumber = phone;
        await student.save();
      }
    }

    // Find or create answer document (linked to student, not registration)
    let answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey,
    });

    // Guard name fields and parent entries for PROFILE saves
    if (partKey === 'PROFILE' && answerDoc) {
      guardNameFields(answerDoc.answers, answers);
      guardParentEntries(answerDoc.answers, answers);
    }

    if (answerDoc) {
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      answerDoc = await StudentFormAnswer.create({
        studentId: student._id,
        partKey,
        answers,
        lastSavedAt: new Date(),
      });
    }

    // Update registration status to IN_PROGRESS if not already
    if (registration.status === ServiceRegistrationStatus.REGISTERED) {
      registration.status = ServiceRegistrationStatus.IN_PROGRESS;
      await registration.save();
    }

    // Sync parent records when PROFILE part's Parental Details is saved
    if (partKey === 'PROFILE') {
      await syncParentsIfPresent(student._id, answerDoc.answers);
    }

    return res.status(200).json({
      success: true,
      message: "Form answers saved successfully",
      data: { answer: answerDoc },
    });
  } catch (error: any) {
    console.error("Save form answers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save form answers",
      error: error.message,
    });
  }
};

// Get form answers for a student (reusable across services)
export const getFormAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;
    const { partKey } = req.query;
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Verify registration belongs to student
    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId: student._id,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Build query - get student's answers (not tied to specific registration)
    const query: any = {
      studentId: student._id,
    };

    if (partKey) {
      query.partKey = partKey;
    }

    const answers = await StudentFormAnswer.find(query);

    return res.status(200).json({
      success: true,
      message: "Form answers fetched successfully",
      data: { 
        answers,
        student: {
          mobileNumber: student.mobileNumber,
        },
      },
    });
  } catch (error: any) {
    console.error("Get form answers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch form answers",
      error: error.message,
    });
  }
};

// Get progress for a registration (check which parts are completed)
export const getProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Verify registration belongs to student
    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId: student._id,
    }).populate("serviceId");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Get student's answers (all parts)
    const answers = await StudentFormAnswer.find({
      studentId: student._id,
    });

    // Calculate progress by part
    const progressByPart: any = {};
    answers.forEach((answer) => {
      progressByPart[answer.partKey] = {
        lastSaved: answer.lastSavedAt,
        hasData: Object.keys(answer.answers || {}).length > 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Progress fetched successfully",
      data: {
        registration,
        progressByPart,
        totalParts: answers.length,
      },
    });
  } catch (error: any) {
    console.error("Get progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      error: error.message,
    });
  }
};

// Delete form answers for a specific part
export const deleteFormAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { answerId } = req.params;
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Find answer
    const answer = await StudentFormAnswer.findById(answerId);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    // Verify ownership
    if (answer.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this answer",
      });
    }

    await StudentFormAnswer.findByIdAndDelete(answerId);

    return res.status(200).json({
      success: true,
      message: "Form answers deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete form answers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete form answers",
      error: error.message,
    });
  }
};

// Get profile form structure + answers for the logged-in student (no registrationId needed)
export const getStudentProfileData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    // Return hardcoded profile sections (only the 4 relevant ones for /profile)
    const formStructure = PROFILE_CONFIG.sections
      .filter(s => PROFILE_PAGE_SECTIONS.includes(s.key))
      .sort((a, b) => a.order - b.order);

    // Get saved answers
    const answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey: "PROFILE",
    });

    return res.status(200).json({
      success: true,
      data: {
        formStructure,
        answers: answerDoc?.answers || {},
        mobileNumber: student.mobileNumber,
      },
    });
  } catch (error: any) {
    console.error("Get student profile data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile data",
      error: error.message,
    });
  }
};

// Save profile answers directly (no registrationId needed)
export const saveStudentProfileData = async (req: AuthRequest, res: Response) => {
  try {
    const { answers } = req.body;
    const userId = req.user?.userId;

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    // Guard: Prevent student from editing name fields
    if (answers) {
      const existingAnswer = await StudentFormAnswer.findOne({
        studentId: student._id,
        partKey: "PROFILE",
      });
      if (existingAnswer?.answers) {
        guardNameFields(existingAnswer.answers, answers);
        guardParentEntries(existingAnswer.answers, answers);
      }
    }

    // Extract phone number if present
    if (answers) {
      const phone = extractPhoneFromAnswers(answers);
      if (phone) {
        student.mobileNumber = phone;
        await student.save();
      }
    }

    let answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey: "PROFILE",
    });

    if (answerDoc) {
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      answerDoc = await StudentFormAnswer.create({
        studentId: student._id,
        partKey: "PROFILE",
        answers,
        lastSavedAt: new Date(),
      });
    }

    // Sync parent records
    await syncParentsIfPresent(student._id, answerDoc.answers);

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      data: { answer: answerDoc },
    });
  } catch (error: any) {
    console.error("Save student profile data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save profile data",
      error: error.message,
    });
  }
};

// Get a specific student's profile data (for other roles to view)
export const getStudentProfileDataById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate('userId', 'firstName middleName lastName email isVerified isActive');
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Return hardcoded profile sections
    const formStructure = PROFILE_CONFIG.sections
      .filter(s => PROFILE_PAGE_SECTIONS.includes(s.key))
      .sort((a, b) => a.order - b.order);

    const answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey: "PROFILE",
    });

    return res.status(200).json({
      success: true,
      data: {
        student,
        formStructure,
        answers: answerDoc?.answers || {},
        mobileNumber: student.mobileNumber,
      },
    });
  } catch (error: any) {
    console.error("Get student profile data by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student profile data",
      error: error.message,
    });
  }
};

// Save a specific student's profile data (for staff roles)
export const saveStudentProfileDataById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { answers } = req.body;
    const callerRole = req.user?.role;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Guard: Protect name fields for ALL roles, and parent entries for non-super-admin
    if (answers) {
      const existingAnswer = await StudentFormAnswer.findOne({
        studentId: student._id,
        partKey: "PROFILE",
      });
      if (existingAnswer?.answers) {
        guardNameFields(existingAnswer.answers, answers);
        if (callerRole !== USER_ROLE.SUPER_ADMIN) {
          guardParentEntries(existingAnswer.answers, answers);
        }
      }
    }

    // Extract phone number if present
    if (answers) {
      const phone = extractPhoneFromAnswers(answers);
      if (phone) {
        student.mobileNumber = phone;
        await student.save();
      }
    }

    let answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey: "PROFILE",
    });

    if (answerDoc) {
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      answerDoc = await StudentFormAnswer.create({
        studentId: student._id,
        partKey: "PROFILE",
        answers,
        lastSavedAt: new Date(),
      });
    }

    // Sync parent records
    await syncParentsIfPresent(student._id, answerDoc.answers);

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      data: { answer: answerDoc },
    });
  } catch (error: any) {
    console.error("Save student profile data by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save profile data",
      error: error.message,
    });
  }
};