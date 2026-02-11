// Pointer 5: Authentic & Reflective Storytelling Service

import Pointer5Task, { IPointer5Task } from '../models/ivy/Pointer5Task';
import Pointer5Submission, { IPointer5Submission } from '../models/ivy/Pointer5Submission';
import Pointer5Evaluation, { IPointer5Evaluation } from '../models/ivy/Pointer5Evaluation';
import StudentPointerScore from '../models/ivy/StudentPointerScore';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import { PointerNo } from '../types/PointerNo';
import mongoose from 'mongoose';
import { createNotification } from './notification.service';

// Create a new task
export const createTask = async (data: {
    studentIvyServiceId: string;
    ivyExpertId: string;
    taskDescription: string;
    wordLimit?: number;
    attachments?: { fileName: string; fileUrl: string }[];
}): Promise<IPointer5Task> => {
    const task = new Pointer5Task({
        studentIvyServiceId: new mongoose.Types.ObjectId(data.studentIvyServiceId),
        ivyExpertId: new mongoose.Types.ObjectId(data.ivyExpertId),
        taskDescription: data.taskDescription,
        wordLimit: data.wordLimit || 500,
        attachments: data.attachments || [],
    });
    await task.save();

    // Create notification to alert student about new task
    const service = await StudentServiceRegistration.findById(data.studentIvyServiceId);
    if (service) {
        await createNotification({
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

// Get all tasks for a student
export const getTasksByStudentServiceId = async (studentIvyServiceId: string): Promise<IPointer5Task[]> => {
    return await Pointer5Task.find({
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    }).sort({ createdAt: -1 });
};

// Get a single task by ID
export const getTaskById = async (taskId: string): Promise<IPointer5Task | null> => {
    return await Pointer5Task.findById(taskId);
};

// Update a task
export const updateTask = async (
    taskId: string,
    data: {
        taskDescription?: string;
        wordLimit?: number;
        attachments?: { fileName: string; fileUrl: string }[];
    }
): Promise<IPointer5Task | null> => {
    return await Pointer5Task.findByIdAndUpdate(taskId, { $set: data }, { new: true });
};

// Delete a task
export const deleteTask = async (taskId: string): Promise<void> => {
    await Pointer5Task.findByIdAndDelete(taskId);
    // Also delete related submissions and evaluations
    const submissions = await Pointer5Submission.find({ taskId: new mongoose.Types.ObjectId(taskId) });
    for (const submission of submissions) {
        await Pointer5Evaluation.deleteMany({ submissionId: submission._id });
    }
    await Pointer5Submission.deleteMany({ taskId: new mongoose.Types.ObjectId(taskId) });
};

// Create or update a submission
export const createOrUpdateSubmission = async (data: {
    taskId: string;
    studentIvyServiceId: string;
    studentResponse: string;
    wordsLearned?: string;
}): Promise<IPointer5Submission> => {
    const wordCount = data.studentResponse.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    const existingSubmission = await Pointer5Submission.findOne({
        taskId: new mongoose.Types.ObjectId(data.taskId),
        studentIvyServiceId: new mongoose.Types.ObjectId(data.studentIvyServiceId),
    });

    if (existingSubmission) {
        existingSubmission.studentResponse = data.studentResponse;
        existingSubmission.wordsLearned = data.wordsLearned || '';
        existingSubmission.wordCount = wordCount;
        existingSubmission.submittedAt = new Date();
        return await existingSubmission.save();
    }

    const submission = new Pointer5Submission({
        taskId: new mongoose.Types.ObjectId(data.taskId),
        studentIvyServiceId: new mongoose.Types.ObjectId(data.studentIvyServiceId),
        studentResponse: data.studentResponse,
        wordsLearned: data.wordsLearned || '',
        wordCount,
    });
    await submission.save();

    // Create notification to alert ivyExpert about new submission
    const service = await StudentServiceRegistration.findById(data.studentIvyServiceId);
    if (service && service.activeIvyExpertId) {
        await createNotification({
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

// Get submission for a specific task
export const getSubmissionByTaskId = async (
    taskId: string,
    studentIvyServiceId: string
): Promise<IPointer5Submission | null> => {
    return await Pointer5Submission.findOne({
        taskId: new mongoose.Types.ObjectId(taskId),
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    });
};

// Get all submissions for a student
export const getSubmissionsByStudentServiceId = async (
    studentIvyServiceId: string
): Promise<IPointer5Submission[]> => {
    return await Pointer5Submission.find({
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    });
};

// Create or update evaluation
export const createOrUpdateEvaluation = async (data: {
    submissionId: string;
    taskId: string;
    studentIvyServiceId: string;
    ivyExpertId: string;
    score: number;
    feedback?: string;
}): Promise<IPointer5Evaluation> => {
    const existingEvaluation = await Pointer5Evaluation.findOne({
        submissionId: new mongoose.Types.ObjectId(data.submissionId),
    });

    let evaluation: IPointer5Evaluation;
    if (existingEvaluation) {
        existingEvaluation.score = data.score;
        existingEvaluation.feedback = data.feedback || '';
        existingEvaluation.evaluatedAt = new Date();
        evaluation = await existingEvaluation.save();
    } else {
        evaluation = new Pointer5Evaluation({
            submissionId: new mongoose.Types.ObjectId(data.submissionId),
            taskId: new mongoose.Types.ObjectId(data.taskId),
            studentIvyServiceId: new mongoose.Types.ObjectId(data.studentIvyServiceId),
            ivyExpertId: new mongoose.Types.ObjectId(data.ivyExpertId),
            score: data.score,
            feedback: data.feedback || '',
        });
        evaluation = await evaluation.save();
    }

    // Calculate the average score for Pointer 5
    const averageScore = await calculatePointer5Score(data.studentIvyServiceId);

    // Update StudentPointerScore for Pointer 5
    await StudentPointerScore.findOneAndUpdate(
        {
            studentIvyServiceId: new mongoose.Types.ObjectId(data.studentIvyServiceId),
            pointerNo: PointerNo.AuthenticStorytelling,
        },
        {
            scoreObtained: averageScore,
            maxScore: 10,
            lastUpdated: new Date(),
        },
        { upsert: true, new: true }
    );

    return evaluation;
};

// Get evaluation for a submission
export const getEvaluationBySubmissionId = async (
    submissionId: string
): Promise<IPointer5Evaluation | null> => {
    return await Pointer5Evaluation.findOne({
        submissionId: new mongoose.Types.ObjectId(submissionId),
    });
};

// Get complete status for a student
export const getCompleteStatus = async (studentIvyServiceId: string) => {
    const tasks = await Pointer5Task.find({
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    }).sort({ createdAt: -1 });

    const taskStatuses = await Promise.all(
        tasks.map(async (task) => {
            const submission = await Pointer5Submission.findOne({
                taskId: task._id,
                studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
            });

            let evaluation = null;
            if (submission) {
                evaluation = await Pointer5Evaluation.findOne({
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
        })
    );

    return {
        studentIvyServiceId,
        tasks: taskStatuses,
    };
};

// Calculate average score for pointer 5
export const calculatePointer5Score = async (studentIvyServiceId: string): Promise<number> => {
    const evaluations = await Pointer5Evaluation.find({
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    });

    if (evaluations.length === 0) return 0;

    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    return totalScore / evaluations.length;
};
