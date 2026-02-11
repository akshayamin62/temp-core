import { Request, Response } from 'express';
import { Answer } from '../models/Answer';
import Student from '../models/Student';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import FormSection from '../models/FormSection';
import { Question } from '../models/Question';
import { ServiceSection } from '../models/ServiceSection';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * @desc    Save/Update answer for a question
 * @route   POST /api/answers/save
 * @access  Private (Student only)
 */
/**
 * @desc    Save entire section answers at once (bulk save)
 * @route   POST /api/answers/save-section
 * @access  Private (Student only)
 */
export const saveSectionAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { enrollmentId, sectionId, sectionInstanceId, answers } = req.body;
    const userId = req.user!.userId;

    console.log('saveSectionAnswers called:', { enrollmentId, sectionId, sectionInstanceId, answersCount: answers?.length });

    // Validate required fields
    if (!enrollmentId || !sectionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID, Section ID, and answers array are required',
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid enrollment or unauthorized access',
      });
    }

    // Verify section exists
    const section = await FormSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    // Generate sectionInstanceId if not provided
    const finalSectionInstanceId = sectionInstanceId || `default-${sectionId}`;

    // Get or create answer document for student
    let answerDoc = await Answer.findOne({ student: student._id });
    if (!answerDoc) {
      answerDoc = await Answer.create({
        student: student._id,
        answers: [],
      });
    }

    // Find or create section answer
    const sectionAnswerIndex = answerDoc.answers.findIndex(
      (a) =>
        a.section.toString() === sectionId &&
        a.sectionInstanceId === finalSectionInstanceId
    );

    let sectionAnswer;
    if (sectionAnswerIndex === -1) {
      // Create new section answer
      answerDoc.answers.push({
        section: sectionId as any,
        sectionInstanceId: finalSectionInstanceId,
        values: [],
      });
      sectionAnswer = answerDoc.answers[answerDoc.answers.length - 1];
    } else {
      sectionAnswer = answerDoc.answers[sectionAnswerIndex];
    }

    // Process all answers for this section
    answers.forEach((answer: { questionId: string; value: any }) => {
      const { questionId, value } = answer;

      // Skip empty values
      if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
        return;
      }

      // Find or create question value
      const questionValueIndex = sectionAnswer.values.findIndex(
        (v) => v.question.toString() === questionId
      );

      if (questionValueIndex === -1) {
        // Create new question value
        sectionAnswer.values.push({
          question: questionId as any,
          value,
          updateHistory: [],
        });
      } else {
        // Update existing value
        sectionAnswer.values[questionValueIndex].value = value;
      }
    });

    // Mark as modified and save
    answerDoc.markModified('answers');
    await answerDoc.save();

    // Update enrollment status to IN_PROGRESS if NOT_STARTED
    if (enrollment.status === EnrollmentStatus.NOT_STARTED) {
      enrollment.status = EnrollmentStatus.IN_PROGRESS;
      await enrollment.save();
    }

    console.log('Section answers saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Section answers saved successfully',
      data: {
        sectionId,
        sectionInstanceId: finalSectionInstanceId,
        savedCount: answers.length,
      },
    });
  } catch (error: any) {
    console.error('Error saving section answers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const saveAnswer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const {
      enrollmentId,
      sectionId,
      sectionInstanceId,
      questionId,
      value,
    } = req.body;

    const userId = req.user!.userId;

    console.log('saveAnswer called:', { enrollmentId, sectionId, sectionInstanceId, questionId, value });

    // Validate required fields
    if (!enrollmentId || !sectionId || !questionId || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID, Section ID, Question ID, and value are required',
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid enrollment or unauthorized access',
      });
    }

    // Verify section and question exist
    const section = await FormSection.findById(sectionId);
    const question = await Question.findById(questionId);

    if (!section || !question) {
      return res.status(404).json({
        success: false,
        message: 'Section or question not found',
      });
    }

    // Generate sectionInstanceId if not provided (for non-repeatable sections)
    const finalSectionInstanceId = sectionInstanceId || `default-${sectionId}`;

    // Get or create answer document for student
    let answerDoc = await Answer.findOne({ student: student._id });
    if (!answerDoc) {
      answerDoc = await Answer.create({
        student: student._id,
        answers: [],
      });
    }

    // Find section answer index
    const sectionAnswerIndex = answerDoc.answers.findIndex(
      (a) =>
        a.section.toString() === sectionId &&
        a.sectionInstanceId === finalSectionInstanceId
    );

    let sectionAnswer;
    if (sectionAnswerIndex === -1) {
      // Create new section answer
      answerDoc.answers.push({
        section: sectionId as any,
        sectionInstanceId: finalSectionInstanceId,
        values: [],
      });
      sectionAnswer = answerDoc.answers[answerDoc.answers.length - 1];
    } else {
      // Use existing section answer
      sectionAnswer = answerDoc.answers[sectionAnswerIndex];
    }

    // Find question value index
    const questionValueIndex = sectionAnswer.values.findIndex(
      (v) => v.question.toString() === questionId
    );

    if (questionValueIndex === -1) {
      // Create new question value (no history yet, will be added on submit)
      sectionAnswer.values.push({
        question: questionId as any,
        value,
        updateHistory: [],
      });
    } else {
      // Update existing value (no history yet, will be added on submit)
      sectionAnswer.values[questionValueIndex].value = value;
    }

    // Mark the answers array as modified for Mongoose
    answerDoc.markModified('answers');
    
    // Save with retry logic to handle version conflicts
    let retries = 3;
    let saved = false;
    
    while (retries > 0 && !saved) {
      try {
        console.log('Saving answer document... (retries left:', retries, ')');
        await answerDoc.save();
        console.log('Answer saved successfully');
        saved = true;
      } catch (saveError: any) {
        if (saveError.name === 'VersionError' && retries > 1) {
          console.log('Version conflict detected, retrying...');
          retries--;
          // Reload the document to get the latest version
          answerDoc = await Answer.findOne({ student: student._id }) || answerDoc;
          
          // Re-apply the changes
          const sectionAnswerIndex = answerDoc.answers.findIndex(
            (a) =>
              a.section.toString() === sectionId &&
              a.sectionInstanceId === finalSectionInstanceId
          );

          if (sectionAnswerIndex === -1) {
            answerDoc.answers.push({
              section: sectionId as any,
              sectionInstanceId: finalSectionInstanceId,
              values: [{
                question: questionId as any,
                value,
                updateHistory: [],
              }],
            });
          } else {
            const sectionAnswer = answerDoc.answers[sectionAnswerIndex];
            const questionValueIndex = sectionAnswer.values.findIndex(
              (v) => v.question.toString() === questionId
            );

            if (questionValueIndex === -1) {
              sectionAnswer.values.push({
                question: questionId as any,
                value,
                updateHistory: [],
              });
            } else {
              sectionAnswer.values[questionValueIndex].value = value;
            }
          }
          
          answerDoc.markModified('answers');
        } else {
          throw saveError;
        }
      }
    }

    // Update enrollment status to IN_PROGRESS if NOT_STARTED
    if (enrollment.status === EnrollmentStatus.NOT_STARTED) {
      enrollment.status = EnrollmentStatus.IN_PROGRESS;
      await enrollment.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Answer saved successfully',
      data: {
        sectionInstanceId: finalSectionInstanceId,
        questionId,
        value,
      },
    });
  } catch (error: any) {
    console.error('Error saving answer:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * @desc    Get answers for a service (with auto-fill from other services)
 * @route   GET /api/answers/service/:serviceId
 * @access  Private (Student only)
 */
export const getServiceAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceId } = req.params;
    const userId = req.user!.userId;

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Get all sections for this service
    const serviceSections = await ServiceSection.find({
      service: serviceId,
      isActive: true,
    })
      .populate({
        path: 'section',
        populate: {
          path: 'questions.question',
        },
      })
      .sort({ order: 1 });

    // Get student's answer document
    const answerDoc = await Answer.findOne({ student: student._id });

    // Build response with auto-fill
    const sectionsWithAnswers = serviceSections.map((ss: any) => {
      const section = ss.section;

      // Find all instances of this section in answers
      const sectionInstances = answerDoc
        ? answerDoc.answers.filter((a) => a.section.toString() === section._id.toString())
        : [];

      // If no instances and section is not repeatable, create default instance
      if (sectionInstances.length === 0 && !section.isRepeatable) {
        return {
          section: {
            _id: section._id,
            title: section.title,
            description: section.description,
            isRepeatable: section.isRepeatable,
            minRepeats: section.minRepeats,
            maxRepeats: section.maxRepeats,
            questions: section.questions,
          },
          instances: [
            {
              sectionInstanceId: `default-${section._id}`,
              answers: {},
            },
          ],
        };
      }

      // Map instances with answers
      const instances = sectionInstances.map((instance) => {
        const answersMap: any = {};
        instance.values.forEach((v) => {
          answersMap[v.question.toString()] = {
            value: v.value,
            lastUpdated: v.updateHistory[v.updateHistory.length - 1]?.updatedAt,
          };
        });

        return {
          sectionInstanceId: instance.sectionInstanceId,
          answers: answersMap,
        };
      });

      return {
        section: {
          _id: section._id,
          title: section.title,
          description: section.description,
          isRepeatable: section.isRepeatable,
          minRepeats: section.minRepeats,
          maxRepeats: section.maxRepeats,
          questions: section.questions,
        },
        instances: instances.length > 0 ? instances : [],
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        serviceId,
        sections: sectionsWithAnswers,
      },
    });
  } catch (error: any) {
    console.error('Error fetching service answers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Add new instance of repeatable section
 * @route   POST /api/answers/add-section-instance
 * @access  Private (Student only)
 */
export const addSectionInstance = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { enrollmentId, sectionId } = req.body;
    const userId = req.user!.userId;

    if (!enrollmentId || !sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID and Section ID are required',
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid enrollment or unauthorized access',
      });
    }

    // Verify section is repeatable
    const section = await FormSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    if (!section.isRepeatable) {
      return res.status(400).json({
        success: false,
        message: 'This section is not repeatable',
      });
    }

    // Get answer document
    let answerDoc = await Answer.findOne({ student: student._id });
    if (!answerDoc) {
      answerDoc = await Answer.create({
        student: student._id,
        answers: [],
      });
    }

    // Count existing instances
    const existingInstances = answerDoc.answers.filter(
      (a) => a.section.toString() === sectionId
    );

    // Check maxRepeats
    if (section.maxRepeats && existingInstances.length >= section.maxRepeats) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${section.maxRepeats} instances allowed for this section`,
      });
    }

    // Create new instance
    const newInstanceId = uuidv4();
    answerDoc.answers.push({
      section: sectionId as any,
      sectionInstanceId: newInstanceId,
      values: [],
    });

    await answerDoc.save();

    return res.status(201).json({
      success: true,
      message: 'Section instance added successfully',
      data: {
        sectionInstanceId: newInstanceId,
        sectionId,
      },
    });
  } catch (error: any) {
    console.error('Error adding section instance:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove instance of repeatable section
 * @route   DELETE /api/answers/remove-section-instance
 * @access  Private (Student only)
 */
export const removeSectionInstance = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { sectionId, sectionInstanceId } = req.body;
    const userId = req.user!.userId;

    if (!sectionId || !sectionInstanceId) {
      return res.status(400).json({
        success: false,
        message: 'Section ID and Section Instance ID are required',
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Get answer document
    const answerDoc = await Answer.findOne({ student: student._id });
    if (!answerDoc) {
      return res.status(404).json({
        success: false,
        message: 'No answers found',
      });
    }

    // Verify section is repeatable
    const section = await FormSection.findById(sectionId);
    if (!section || !section.isRepeatable) {
      return res.status(400).json({
        success: false,
        message: 'Section not found or not repeatable',
      });
    }

    // Count existing instances
    const existingInstances = answerDoc.answers.filter(
      (a) => a.section.toString() === sectionId
    );

    // Check minRepeats
    if (existingInstances.length <= (section.minRepeats || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum ${section.minRepeats || 0} instances required for this section`,
      });
    }

    // Remove instance
    answerDoc.answers = answerDoc.answers.filter(
      (a) =>
        !(
          a.section.toString() === sectionId &&
          a.sectionInstanceId === sectionInstanceId
        )
    );

    await answerDoc.save();

    return res.status(200).json({
      success: true,
      message: 'Section instance removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing section instance:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Submit form (mark enrollment as submitted)
 * @route   POST /api/answers/submit
 * @access  Private (Student only)
 */
export const submitForm = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { enrollmentId } = req.body;
    const userId = req.user!.userId;

    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID is required',
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findById(enrollmentId).populate('service');
    if (!enrollment || enrollment.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid enrollment or unauthorized access',
      });
    }

    // Get answer document for student
    const answerDoc = await Answer.findOne({ student: student._id });
    if (answerDoc) {
      // Add update history for all answers related to this enrollment
      for (const sectionAnswer of answerDoc.answers) {
        for (const questionValue of sectionAnswer.values) {
          // Add current value to history if not already there
          const hasCurrentValue = questionValue.updateHistory.some(
            (h) => h.value === questionValue.value
          );
          
          if (!hasCurrentValue) {
            questionValue.updateHistory.push({
              value: questionValue.value,
              updatedAt: new Date(),
              updatedBy: 'STUDENT',
              updatedByUser: userId as any,
            });
          }
        }
      }
      await answerDoc.save();
    }

    // Update enrollment status
    enrollment.status = EnrollmentStatus.SUBMITTED;
    enrollment.submittedAt = new Date();
    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      data: { enrollment },
    });
  } catch (error: any) {
    console.error('Error submitting form:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all answers for a student (Admin/Counselor view)
 * @route   GET /api/answers/student/:studentId
 * @access  Private (Admin/Counselor only)
 */
export const getStudentAnswers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const answerDoc = await Answer.findOne({ student: studentId })
      .populate('student')
      .populate({
        path: 'answers.section',
        populate: {
          path: 'questions.question',
        },
      })
      .populate('answers.values.question')
      .populate('answers.values.updateHistory.updatedByUser', 'name email role');

    if (!answerDoc) {
      return res.status(404).json({
        success: false,
        message: 'No answers found for this student',
      });
    }

    return res.status(200).json({
      success: true,
      data: { answers: answerDoc },
    });
  } catch (error: any) {
    console.error('Error fetching student answers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

