import { Response } from "express";
import StudentFormAnswer from "../models/StudentFormAnswer";
import Student from "../models/Student";
import StudentServiceRegistration, {
  ServiceRegistrationStatus,
} from "../models/StudentServiceRegistration";
import FormPart, { FormPartKey } from "../models/FormPart";
import FormSection from "../models/FormSection";
import FormSubSection from "../models/FormSubSection";
import FormField from "../models/FormField";
import { AuthRequest } from "../types/auth";
import { USER_ROLE } from "../types/roles";
import { syncParentsFromFormAnswers } from "../utils/parentSync";

// Save form answers (part-wise for reusability across services)
export const saveFormAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, partKey, answers } = req.body;
    const userId = req.user?.userId;

    // Get student record from userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Verify registration belongs to student (for tracking)
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

    // Extract phone number from answers if present (PROFILE part)
    if (partKey === 'PROFILE' && answers) {
      let studentUpdated = false;
      
      // Navigate through the nested structure: answers[sectionId][subSectionId][index]
      for (const sectionId in answers) {
        const sectionData = answers[sectionId];
        if (typeof sectionData === 'object' && sectionData !== null) {
          for (const subSectionId in sectionData) {
            const subSectionData = sectionData[subSectionId];
            if (Array.isArray(subSectionData)) {
              // Check first instance (index 0)
              const instanceData = subSectionData[0] || {};
              
              // Update phone number if present (check multiple possible keys)
              const phoneValue = instanceData.phoneNumber || instanceData.mobileNumber || instanceData.phone;
              if (phoneValue && phoneValue.trim()) {
                student.mobileNumber = phoneValue.trim();
                studentUpdated = true;
              }
            }
          }
        }
      }
      
      // Save student updates if any
      if (studentUpdated) {
        await student.save();
      }
    }

    // Find or create answer document (linked to student, not registration)
    // This allows answers to be reused across multiple services
    let answerDoc = await StudentFormAnswer.findOne({
      studentId: student._id,
      partKey,
    });

    if (answerDoc) {
      // Update existing - merge new answers with existing
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      // Create new
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
      try {
        const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
        if (profilePart) {
          const parentalSection = await FormSection.findOne({
            partId: profilePart._id,
            title: "Parental Details",
            isActive: true,
          });
          if (parentalSection) {
            const sKey = parentalSection._id.toString();
            const savedAnswers = answerDoc.answers?.[sKey];
            if (savedAnswers) {
              for (const subKey of Object.keys(savedAnswers)) {
                const entries = savedAnswers[subKey];
                if (Array.isArray(entries) && entries.length > 0) {
                  await syncParentsFromFormAnswers(student._id, entries);
                }
              }
            }
          }
        }
      } catch (syncError) {
        console.error("⚠️ Parent sync after form save failed:", syncError);
      }
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
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Get PROFILE part  
    const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
    if (!profilePart) {
      return res.status(404).json({ success: false, message: "Profile form part not found" });
    }

    // Get sections for profile (only the 4 relevant ones)
    const sectionTitles = ["Personal Details", "Parental Details", "Academic Qualification", "Work Experience"];
    const sections = await FormSection.find({
      partId: profilePart._id,
      title: { $in: sectionTitles },
      isActive: true,
    }).sort({ order: 1 });

    // Get subsections and fields for each section
    const formStructure = [];
    for (const section of sections) {
      const subSections = await FormSubSection.find({
        sectionId: section._id,
        isActive: true,
      }).sort({ order: 1 });

      const subSectionsWithFields = [];
      for (const subSection of subSections) {
        const fields = await FormField.find({
          subSectionId: subSection._id,
          isActive: true,
        }).sort({ order: 1 });

        subSectionsWithFields.push({
          ...subSection.toObject(),
          fields,
        });
      }

      formStructure.push({
        ...section.toObject(),
        subSections: subSectionsWithFields,
      });
    }

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
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Guard: Prevent student from editing name fields (firstName, middleName, lastName)
    // in Personal Details section
    if (answers) {
      const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
      if (profilePart) {
        const personalSection = await FormSection.findOne({
          partId: profilePart._id,
          title: "Personal Details",
          isActive: true,
        });
        if (personalSection) {
          const personalKey = personalSection._id.toString();
          const existingAnswer = await StudentFormAnswer.findOne({
            studentId: student._id,
            partKey: "PROFILE",
          });
          if (existingAnswer?.answers?.[personalKey] && answers[personalKey]) {
            const existingData = existingAnswer.answers[personalKey];
            const incomingData = answers[personalKey];
            for (const subKey of Object.keys(incomingData)) {
              const existingEntries: any[] = existingData[subKey] || [];
              const incomingEntries: any[] = incomingData[subKey] || [];
              if (existingEntries[0]) {
                const nameFields = ['firstName', 'middleName', 'lastName'];
                for (const field of nameFields) {
                  if (existingEntries[0][field] !== undefined) {
                    if (!incomingEntries[0]) incomingEntries[0] = {};
                    incomingEntries[0][field] = existingEntries[0][field];
                  }
                }
              }
            }
          }
        }

        // Guard: Prevent student from editing already-filled Parental Details entries
        // but allow adding new entries up to maxRepeat=2
        const parentalSection = await FormSection.findOne({
          partId: profilePart._id,
          title: "Parental Details",
          isActive: true,
        });
        if (parentalSection) {
          const sectionKey = parentalSection._id.toString();
          const existingAnswer = await StudentFormAnswer.findOne({
            studentId: student._id,
            partKey: "PROFILE",
          });
          if (existingAnswer?.answers?.[sectionKey] && answers[sectionKey]) {
            const existingSectionData = existingAnswer.answers[sectionKey];
            const incomingSectionData = answers[sectionKey];
            // For each subsection, preserve already-filled entries
            for (const subKey of Object.keys(incomingSectionData)) {
              const existingEntries: any[] = existingSectionData[subKey] || [];
              const incomingEntries: any[] = incomingSectionData[subKey] || [];
              const merged: any[] = [];
              for (let idx = 0; idx < Math.max(existingEntries.length, incomingEntries.length); idx++) {
                const existing = existingEntries[idx];
                const hasFilled = existing && Object.values(existing).some((v: any) => v && String(v).trim() !== "");
                if (hasFilled) {
                  // Keep existing entry — student can't overwrite
                  merged.push(existing);
                } else if (incomingEntries[idx]) {
                  merged.push(incomingEntries[idx]);
                }
              }
              // Cap at 2 entries
              incomingSectionData[subKey] = merged.slice(0, 2);
            }
            answers[sectionKey] = incomingSectionData;
          }
        }
      }
    }

    // Extract phone number if present
    if (answers) {
      for (const sectionId in answers) {
        const sectionData = answers[sectionId];
        if (typeof sectionData === 'object' && sectionData !== null) {
          for (const subSectionId in sectionData) {
            const subSectionData = sectionData[subSectionId];
            if (Array.isArray(subSectionData)) {
              const instanceData = subSectionData[0] || {};
              const phoneValue = instanceData.phoneNumber || instanceData.mobileNumber || instanceData.phone;
              if (phoneValue && phoneValue.trim()) {
                student.mobileNumber = phoneValue.trim();
                await student.save();
              }
            }
          }
        }
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

    // Sync parent records from Parental Details entries
    try {
      const profilePart2 = await FormPart.findOne({ key: FormPartKey.PROFILE });
      if (profilePart2) {
        const parentalSection2 = await FormSection.findOne({
          partId: profilePart2._id,
          title: "Parental Details",
          isActive: true,
        });
        if (parentalSection2) {
          const sKey = parentalSection2._id.toString();
          const savedAnswers = answerDoc.answers?.[sKey];
          if (savedAnswers) {
            for (const subKey of Object.keys(savedAnswers)) {
              const entries = savedAnswers[subKey];
              if (Array.isArray(entries) && entries.length > 0) {
                await syncParentsFromFormAnswers(student._id, entries);
              }
            }
          }
        }
      }
    } catch (syncError) {
      console.error("⚠️ Parent sync after profile save failed:", syncError);
    }

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
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get PROFILE part
    const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
    if (!profilePart) {
      return res.status(404).json({ success: false, message: "Profile form part not found" });
    }

    // Get sections
    const sectionTitles = ["Personal Details", "Parental Details", "Academic Qualification", "Work Experience"];
    const sections = await FormSection.find({
      partId: profilePart._id,
      title: { $in: sectionTitles },
      isActive: true,
    }).sort({ order: 1 });

    const formStructure = [];
    for (const section of sections) {
      const subSections = await FormSubSection.find({
        sectionId: section._id,
        isActive: true,
      }).sort({ order: 1 });

      const subSectionsWithFields = [];
      for (const subSection of subSections) {
        const fields = await FormField.find({
          subSectionId: subSection._id,
          isActive: true,
        }).sort({ order: 1 });

        subSectionsWithFields.push({
          ...subSection.toObject(),
          fields,
        });
      }

      formStructure.push({
        ...section.toObject(),
        subSections: subSectionsWithFields,
      });
    }

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
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Guard: Protect student name fields for non-super-admin callers
    if (answers && callerRole !== USER_ROLE.SUPER_ADMIN) {
      const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
      if (profilePart) {
        const personalSection = await FormSection.findOne({
          partId: profilePart._id,
          title: "Personal Details",
          isActive: true,
        });
        if (personalSection) {
          const personalKey = personalSection._id.toString();
          const existingAnswer = await StudentFormAnswer.findOne({
            studentId: student._id,
            partKey: "PROFILE",
          });
          if (existingAnswer?.answers?.[personalKey] && answers[personalKey]) {
            const existingData = existingAnswer.answers[personalKey];
            const incomingData = answers[personalKey];
            for (const subKey of Object.keys(incomingData)) {
              const existingEntries: any[] = existingData[subKey] || [];
              const incomingEntries: any[] = incomingData[subKey] || [];
              if (existingEntries[0]) {
                const nameFields = ['firstName', 'middleName', 'lastName'];
                for (const field of nameFields) {
                  if (existingEntries[0][field] !== undefined) {
                    if (!incomingEntries[0]) incomingEntries[0] = {};
                    incomingEntries[0][field] = existingEntries[0][field];
                  }
                }
              }
            }
          }
        }
      }
    }

    // Extract phone number if present
    if (answers) {
      for (const sectionId in answers) {
        const sectionData = answers[sectionId];
        if (typeof sectionData === 'object' && sectionData !== null) {
          for (const subSectionId in sectionData) {
            const subSectionData = sectionData[subSectionId];
            if (Array.isArray(subSectionData)) {
              const instanceData = subSectionData[0] || {};
              const phoneValue = instanceData.phoneNumber || instanceData.mobileNumber || instanceData.phone;
              if (phoneValue && phoneValue.trim()) {
                student.mobileNumber = phoneValue.trim();
                await student.save();
              }
            }
          }
        }
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

    // Sync parent records from Parental Details entries
    try {
      const profilePart = await FormPart.findOne({ key: FormPartKey.PROFILE });
      if (profilePart) {
        const parentalSection = await FormSection.findOne({
          partId: profilePart._id,
          title: "Parental Details",
          isActive: true,
        });
        if (parentalSection) {
          const sKey = parentalSection._id.toString();
          const savedAnswers = answerDoc.answers?.[sKey];
          if (savedAnswers) {
            for (const subKey of Object.keys(savedAnswers)) {
              const entries = savedAnswers[subKey];
              if (Array.isArray(entries) && entries.length > 0) {
                await syncParentsFromFormAnswers(student._id, entries);
              }
            }
          }
        }
      }
    } catch (syncError) {
      console.error("⚠️ Parent sync after staff profile save failed:", syncError);
    }

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