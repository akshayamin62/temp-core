import { IIvyExpertSelectedSuggestion } from '../models/ivy/IvyExpertSelectedSuggestion';
import { IStudentSubmission } from '../models/ivy/StudentSubmission';
import { IIvyExpertEvaluation } from '../models/ivy/IvyExpertEvaluation';
import { PointerNo } from '../types/PointerNo';
/**
 * Save uploaded file to local storage
 */
export declare const saveFile: (file: Express.Multer.File, subfolder: string) => Promise<string>;
/**
 * Select activities (Ivy Expert only)
 * Input: studentIvyServiceId, ivyExpertId, agentSuggestionIds (array), pointerNo (2|3|4), weightages (optional for Pointer 2)
 */
export declare const selectActivities: (studentIvyServiceId: string, ivyExpertId: string, agentSuggestionIds: string[], pointerNo: PointerNo, weightages?: number[]) => Promise<IIvyExpertSelectedSuggestion[]>;
/**
 * Get student activities with status (for student, parent, ivyExpert views)
 * Returns activities with proof upload status and evaluation status
 */
export declare const getStudentActivities: (studentId: string, studentIvyServiceId?: string) => Promise<any[]>;
/**
 * Upload proof for an activity (Student only)
 * Input: studentIvyServiceId, studentId, ivyExpertSelectedSuggestionId, files (array)
 */
export declare const uploadProof: (studentIvyServiceId: string, studentId: string, ivyExpertSelectedSuggestionId: string, files: Express.Multer.File[]) => Promise<IStudentSubmission>;
/**
 * Evaluate activity (Ivy Expert only)
 * Input: studentSubmissionId, ivyExpertId, score, feedback?
 */
export declare const evaluateActivity: (studentSubmissionId: string, ivyExpertId: string, score: number, feedback?: string) => Promise<IIvyExpertEvaluation>;
/**
 * Update weightages for selected activities (Ivy Expert only)
 * Input: studentIvyServiceId, ivyExpertId, weightages map { agentSuggestionId: weightage }, pointerNo
 */
export declare const updateWeightages: (studentIvyServiceId: string, ivyExpertId: string, weightages: {
    [agentSuggestionId: string]: number;
}, pointerNo?: number) => Promise<IIvyExpertSelectedSuggestion[]>;
//# sourceMappingURL=pointer234Activity.service.d.ts.map