"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFormAnswers = exports.getProgress = exports.getFormAnswers = exports.saveFormAnswers = void 0;
const StudentFormAnswer_1 = __importDefault(require("../models/StudentFormAnswer"));
const Student_1 = __importDefault(require("../models/Student"));
const StudentServiceRegistration_1 = __importStar(require("../models/StudentServiceRegistration"));
// Save form answers (part-wise for reusability across services)
const saveFormAnswers = async (req, res) => {
    try {
        const { registrationId, partKey, answers } = req.body;
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        // Verify registration belongs to student (for tracking)
        const registration = await StudentServiceRegistration_1.default.findOne({
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
        let answerDoc = await StudentFormAnswer_1.default.findOne({
            studentId: student._id,
            partKey,
        });
        if (answerDoc) {
            // Update existing - merge new answers with existing
            answerDoc.answers = { ...answerDoc.answers, ...answers };
            answerDoc.lastSavedAt = new Date();
            await answerDoc.save();
        }
        else {
            // Create new
            answerDoc = await StudentFormAnswer_1.default.create({
                studentId: student._id,
                partKey,
                answers,
                lastSavedAt: new Date(),
            });
        }
        // Update registration status to IN_PROGRESS if not already
        if (registration.status === StudentServiceRegistration_1.ServiceRegistrationStatus.REGISTERED) {
            registration.status = StudentServiceRegistration_1.ServiceRegistrationStatus.IN_PROGRESS;
            await registration.save();
        }
        return res.status(200).json({
            success: true,
            message: "Form answers saved successfully",
            data: { answer: answerDoc },
        });
    }
    catch (error) {
        console.error("Save form answers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to save form answers",
            error: error.message,
        });
    }
};
exports.saveFormAnswers = saveFormAnswers;
// Get form answers for a student (reusable across services)
const getFormAnswers = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { partKey } = req.query;
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        // Verify registration belongs to student
        const registration = await StudentServiceRegistration_1.default.findOne({
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
        const query = {
            studentId: student._id,
        };
        if (partKey) {
            query.partKey = partKey;
        }
        const answers = await StudentFormAnswer_1.default.find(query);
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
    }
    catch (error) {
        console.error("Get form answers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch form answers",
            error: error.message,
        });
    }
};
exports.getFormAnswers = getFormAnswers;
// Get progress for a registration (check which parts are completed)
const getProgress = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        // Verify registration belongs to student
        const registration = await StudentServiceRegistration_1.default.findOne({
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
        const answers = await StudentFormAnswer_1.default.find({
            studentId: student._id,
        });
        // Calculate progress by part
        const progressByPart = {};
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
    }
    catch (error) {
        console.error("Get progress error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch progress",
            error: error.message,
        });
    }
};
exports.getProgress = getProgress;
// Delete form answers for a specific part
const deleteFormAnswers = async (req, res) => {
    try {
        const { answerId } = req.params;
        const userId = req.user?.userId;
        // Get student record from userId
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student record not found",
            });
        }
        // Find answer
        const answer = await StudentFormAnswer_1.default.findById(answerId);
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
        await StudentFormAnswer_1.default.findByIdAndDelete(answerId);
        return res.status(200).json({
            success: true,
            message: "Form answers deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete form answers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete form answers",
            error: error.message,
        });
    }
};
exports.deleteFormAnswers = deleteFormAnswers;
//# sourceMappingURL=formAnswerController.js.map