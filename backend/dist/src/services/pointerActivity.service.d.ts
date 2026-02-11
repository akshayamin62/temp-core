import mongoose from 'mongoose';
import { PointerNo } from '../types/PointerNo';
export declare const selectActivities: (studentIvyServiceId: string, ivyExpertId: string, pointerNo: number, agentSuggestionIds: string[], isVisibleToStudent?: boolean, weightages?: number[], deadlines?: string[]) => Promise<{
    selection: mongoose.Document<unknown, {}, import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion, {}, {}> & import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    suggestion: mongoose.Document<unknown, {}, import("../models/ivy/AgentSuggestion").IAgentSuggestion, {}, {}> & import("../models/ivy/AgentSuggestion").IAgentSuggestion & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
}[]>;
export declare const uploadProof: (ivyExpertSelectedSuggestionId: string, studentId: string, files: Express.Multer.File[], remarks?: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/StudentSubmission").IStudentSubmission, {}, {}> & import("../models/ivy/StudentSubmission").IStudentSubmission & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const evaluateActivity: (studentSubmissionId: string, ivyExpertId: string, score: number, feedback?: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/IvyExpertEvaluation").IIvyExpertEvaluation, {}, {}> & import("../models/ivy/IvyExpertEvaluation").IIvyExpertEvaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const getStudentActivities: (studentIdOrServiceId: string, useServiceId?: boolean, includeInvisible?: boolean) => Promise<{
    studentIvyServiceId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    ivyExpertId: mongoose.Types.ObjectId | undefined;
    activities: {
        selectionId: mongoose.Types.ObjectId;
        pointerNo: PointerNo;
        isVisibleToStudent: boolean;
        suggestion: (mongoose.Document<unknown, {}, import("../models/ivy/AgentSuggestion").IAgentSuggestion, {}, {}> & import("../models/ivy/AgentSuggestion").IAgentSuggestion & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        }) | undefined;
        selectedAt: Date | undefined;
        weightage: number | undefined;
        deadline: Date | null;
        ivyExpertDocuments: import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertDocumentEntry[];
        proofUploaded: boolean;
        evaluated: boolean;
        submission: {
            _id: mongoose.Types.ObjectId;
            files: string[];
            remarks: string | undefined;
            submittedAt: Date | undefined;
        } | null;
        evaluation: {
            _id: mongoose.Types.ObjectId;
            score: number;
            feedback: string | undefined;
            evaluatedAt: Date | undefined;
        } | null;
    }[];
}>;
export declare const uploadIvyExpertDocuments: (selectionId: string, ivyExpertId: string, files: Express.Multer.File[]) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion, {}, {}> & import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const updateDocumentTaskStatus: (selectionId: string, ivyExpertId: string, documentUrl: string, taskIndex: number, status: "not-started" | "in-progress" | "completed") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion, {}, {}> & import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const setActivityDeadline: (selectionId: string, ivyExpertId: string, deadline: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion, {}, {}> & import("../models/ivy/IvyExpertSelectedSuggestion").IIvyExpertSelectedSuggestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=pointerActivity.service.d.ts.map