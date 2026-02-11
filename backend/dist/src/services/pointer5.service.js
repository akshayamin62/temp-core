"use strict";
// Pointer 5: Authentic & Reflective Storytelling Service
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePointer5Score = exports.getCompleteStatus = exports.getEvaluationBySubmissionId = exports.createOrUpdateEvaluation = exports.getSubmissionsByStudentServiceId = exports.getSubmissionByTaskId = exports.createOrUpdateSubmission = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasksByStudentServiceId = exports.createTask = void 0;
const Pointer5Task_1 = __importDefault(require("../models/ivy/Pointer5Task"));
const Pointer5Submission_1 = __importDefault(require("../models/ivy/Pointer5Submission"));
const Pointer5Evaluation_1 = __importDefault(require("../models/ivy/Pointer5Evaluation"));
const StudentPointerScore_1 = __importDefault(require("../models/ivy/StudentPointerScore"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const PointerNo_1 = require("../types/PointerNo");
const mongoose_1 = __importDefault(require("mongoose"));
const notification_service_1 = require("./notification.service");
// Create a new task
const createTask = async (data) => {
    const task = new Pointer5Task_1.default({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(data.studentIvyServiceId),
        ivyExpertId: new mongoose_1.default.Types.ObjectId(data.ivyExpertId),
        taskDescription: data.taskDescription,
        wordLimit: data.wordLimit || 500,
        attachments: data.attachments || [],
    });
    await task.save();
    // Create notification to alert student about new task
    const service = await StudentServiceRegistration_1.default.findById(data.studentIvyServiceId);
    if (service) {
        await (0, notification_service_1.createNotification)({
            studentIvyServiceId: data.studentIvyServiceId,
            userId: service.studentId,
            userRole: 'student',
            pointerNumber: 5,
            notificationType: 'essay_task_assigned',
            referenceId: task._id,
        });
    }
    return task;
};
exports.createTask = createTask;
// Get all tasks for a student
const getTasksByStudentServiceId = async (studentIvyServiceId) => {
    return await Pointer5Task_1.default.find({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
    }).sort({ createdAt: -1 });
};
exports.getTasksByStudentServiceId = getTasksByStudentServiceId;
// Get a single task by ID
const getTaskById = async (taskId) => {
    return await Pointer5Task_1.default.findById(taskId);
};
exports.getTaskById = getTaskById;
// Update a task
const updateTask = async (taskId, data) => {
    return await Pointer5Task_1.default.findByIdAndUpdate(taskId, { $set: data }, { new: true });
};
exports.updateTask = updateTask;
// Delete a task
const deleteTask = async (taskId) => {
    await Pointer5Task_1.default.findByIdAndDelete(taskId);
    // Also delete related submissions and evaluations
    const submissions = await Pointer5Submission_1.default.find({ taskId: new mongoose_1.default.Types.ObjectId(taskId) });
    for (const submission of submissions) {
        await Pointer5Evaluation_1.default.deleteMany({ submissionId: submission._id });
    }
    await Pointer5Submission_1.default.deleteMany({ taskId: new mongoose_1.default.Types.ObjectId(taskId) });
};
exports.deleteTask = deleteTask;
// Create or update a submission
const createOrUpdateSubmission = async (data) => {
    const wordCount = data.studentResponse.trim().split(/\s+/).filter(w => w.length > 0).length;
    const existingSubmission = await Pointer5Submission_1.default.findOne({
        taskId: new mongoose_1.default.Types.ObjectId(data.taskId),
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(data.studentIvyServiceId),
    });
    if (existingSubmission) {
        existingSubmission.studentResponse = data.studentResponse;
        existingSubmission.wordsLearned = data.wordsLearned || '';
        existingSubmission.wordCount = wordCount;
        existingSubmission.submittedAt = new Date();
        return await existingSubmission.save();
    }
    const submission = new Pointer5Submission_1.default({
        taskId: new mongoose_1.default.Types.ObjectId(data.taskId),
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(data.studentIvyServiceId),
        studentResponse: data.studentResponse,
        wordsLearned: data.wordsLearned || '',
        wordCount,
    });
    await submission.save();
    // Create notification to alert ivyExpert about new submission
    const service = await StudentServiceRegistration_1.default.findById(data.studentIvyServiceId);
    if (service && service.activeIvyExpertId) {
        await (0, notification_service_1.createNotification)({
            studentIvyServiceId: data.studentIvyServiceId,
            userId: service.activeIvyExpertId,
            userRole: 'ivyExpert',
            pointerNumber: 5,
            notificationType: 'essay_submitted',
            referenceId: submission._id,
        });
    }
    return submission;
};
exports.createOrUpdateSubmission = createOrUpdateSubmission;
// Get submission for a specific task
const getSubmissionByTaskId = async (taskId, studentIvyServiceId) => {
    return await Pointer5Submission_1.default.findOne({
        taskId: new mongoose_1.default.Types.ObjectId(taskId),
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
    });
};
exports.getSubmissionByTaskId = getSubmissionByTaskId;
// Get all submissions for a student
const getSubmissionsByStudentServiceId = async (studentIvyServiceId) => {
    return await Pointer5Submission_1.default.find({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
    });
};
exports.getSubmissionsByStudentServiceId = getSubmissionsByStudentServiceId;
// Create or update evaluation
const createOrUpdateEvaluation = async (data) => {
    const existingEvaluation = await Pointer5Evaluation_1.default.findOne({
        submissionId: new mongoose_1.default.Types.ObjectId(data.submissionId),
    });
    let evaluation;
    if (existingEvaluation) {
        existingEvaluation.score = data.score;
        existingEvaluation.feedback = data.feedback || '';
        existingEvaluation.evaluatedAt = new Date();
        evaluation = await existingEvaluation.save();
    }
    else {
        evaluation = new Pointer5Evaluation_1.default({
            submissionId: new mongoose_1.default.Types.ObjectId(data.submissionId),
            taskId: new mongoose_1.default.Types.ObjectId(data.taskId),
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(data.studentIvyServiceId),
            ivyExpertId: new mongoose_1.default.Types.ObjectId(data.ivyExpertId),
            score: data.score,
            feedback: data.feedback || '',
        });
        evaluation = await evaluation.save();
    }
    // Calculate the average score for Pointer 5
    const averageScore = await (0, exports.calculatePointer5Score)(data.studentIvyServiceId);
    // Update StudentPointerScore for Pointer 5
    await StudentPointerScore_1.default.findOneAndUpdate({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(data.studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.AuthenticStorytelling,
    }, {
        scoreObtained: averageScore,
        maxScore: 10,
        lastUpdated: new Date(),
    }, { upsert: true, new: true });
    return evaluation;
};
exports.createOrUpdateEvaluation = createOrUpdateEvaluation;
// Get evaluation for a submission
const getEvaluationBySubmissionId = async (submissionId) => {
    return await Pointer5Evaluation_1.default.findOne({
        submissionId: new mongoose_1.default.Types.ObjectId(submissionId),
    });
};
exports.getEvaluationBySubmissionId = getEvaluationBySubmissionId;
// Get complete status for a student
const getCompleteStatus = async (studentIvyServiceId) => {
    const tasks = await Pointer5Task_1.default.find({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
    }).sort({ createdAt: -1 });
    const taskStatuses = await Promise.all(tasks.map(async (task) => {
        const submission = await Pointer5Submission_1.default.findOne({
            taskId: task._id,
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        });
        let evaluation = null;
        if (submission) {
            evaluation = await Pointer5Evaluation_1.default.findOne({
                submissionId: submission._id,
            });
        }
        return {
            task: {
                _id: task._id,
                taskDescription: task.taskDescription,
                wordLimit: task.wordLimit,
                attachments: task.attachments,
                createdAt: task.createdAt,
            },
            submission: submission
                ? {
                    _id: submission._id,
                    studentResponse: submission.studentResponse,
                    wordsLearned: submission.wordsLearned,
                    wordCount: submission.wordCount,
                    submittedAt: submission.submittedAt,
                }
                : null,
            evaluation: evaluation
                ? {
                    _id: evaluation._id,
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    evaluatedAt: evaluation.evaluatedAt,
                }
                : null,
        };
    }));
    return {
        studentIvyServiceId,
        tasks: taskStatuses,
    };
};
exports.getCompleteStatus = getCompleteStatus;
// Calculate average score for pointer 5
const calculatePointer5Score = async (studentIvyServiceId) => {
    const evaluations = await Pointer5Evaluation_1.default.find({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
    });
    if (evaluations.length === 0)
        return 0;
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    return totalScore / evaluations.length;
};
exports.calculatePointer5Score = calculatePointer5Score;
//# sourceMappingURL=pointer5.service.js.map