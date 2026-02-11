import { Response } from "express";
import StudentFormAnswer from "../models/StudentFormAnswer";
import Student from "../models/Student";
import StudentServiceRegistration, {
  ServiceRegistrationStatus,
} from "../models/StudentServiceRegistration";
import { AuthRequest } from "../types/auth";

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


