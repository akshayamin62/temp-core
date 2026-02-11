import { IPointer5Task } from '../models/ivy/Pointer5Task';
import { IPointer5Submission } from '../models/ivy/Pointer5Submission';
import { IPointer5Evaluation } from '../models/ivy/Pointer5Evaluation';
import mongoose from 'mongoose';
export declare const createTask: (data: {
    studentIvyServiceId: string;
    ivyExpertId: string;
    taskDescription: string;
    wordLimit?: number;
    attachments?: {
        fileName: string;
        fileUrl: string;
    }[];
}) => Promise<IPointer5Task>;
export declare const getTasksByStudentServiceId: (studentIvyServiceId: string) => Promise<IPointer5Task[]>;
export declare const getTaskById: (taskId: string) => Promise<IPointer5Task | null>;
export declare const updateTask: (taskId: string, data: {
    taskDescription?: string;
    wordLimit?: number;
    attachments?: {
        fileName: string;
        fileUrl: string;
    }[];
}) => Promise<IPointer5Task | null>;
export declare const deleteTask: (taskId: string) => Promise<void>;
export declare const createOrUpdateSubmission: (data: {
    taskId: string;
    studentIvyServiceId: string;
    studentResponse: string;
    wordsLearned?: string;
}) => Promise<IPointer5Submission>;
export declare const getSubmissionByTaskId: (taskId: string, studentIvyServiceId: string) => Promise<IPointer5Submission | null>;
export declare const getSubmissionsByStudentServiceId: (studentIvyServiceId: string) => Promise<IPointer5Submission[]>;
export declare const createOrUpdateEvaluation: (data: {
    submissionId: string;
    taskId: string;
    studentIvyServiceId: string;
    ivyExpertId: string;
    score: number;
    feedback?: string;
}) => Promise<IPointer5Evaluation>;
export declare const getEvaluationBySubmissionId: (submissionId: string) => Promise<IPointer5Evaluation | null>;
export declare const getCompleteStatus: (studentIvyServiceId: string) => Promise<{
    studentIvyServiceId: string;
    tasks: {
        task: {
            _id: mongoose.Types.ObjectId;
            taskDescription: string;
            wordLimit: number;
            attachments: {
                fileName: string;
                fileUrl: string;
            }[];
            createdAt: Date;
        };
        submission: {
            _id: mongoose.Types.ObjectId;
            studentResponse: string;
            wordsLearned: string;
            wordCount: number;
            submittedAt: Date;
        } | null;
        evaluation: {
            _id: mongoose.Types.ObjectId;
            score: number;
            feedback: string;
            evaluatedAt: Date;
        } | null;
    }[];
}>;
export declare const calculatePointer5Score: (studentIvyServiceId: string) => Promise<number>;
//# sourceMappingURL=pointer5.service.d.ts.map