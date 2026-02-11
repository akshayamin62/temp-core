import mongoose from 'mongoose';
import { PointerNo } from '../types/PointerNo';
/**
 * Calculate and aggregate scores for a student
 * Each pointer: 0-10 scale
 * Total: Weighted average out of 10 based on pointer importance
 * Weightages:
 * 1. Academic Excellence - 30%
 * 2. Spike in one Area - 20%
 * 3. Leadership & Initiative - 15%
 * 4. Global or Social Impact - 10%
 * 5. Authentic, Reflective Storytelling - 15%
 * 6. Engagement with Learning & Intellectual Curiosity - 10%
 */
export declare const calculateIvyScore: (studentUserId: string, studentIvyServiceId?: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/StudentIvyScoreCard").IStudentIvyScoreCard, {}, {}> & import("../models/ivy/StudentIvyScoreCard").IStudentIvyScoreCard & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/**
 * Get Ivy score for a student
 */
export declare const getIvyScore: (studentUserId: string, studentIvyServiceId?: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/StudentIvyScoreCard").IStudentIvyScoreCard, {}, {}> & import("../models/ivy/StudentIvyScoreCard").IStudentIvyScoreCard & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/**
 * Update score after evaluation submission
 * This should be called whenever a pointer evaluation is submitted
 */
export declare const updateScoreAfterEvaluation: (studentIvyServiceId: string, pointerNo: PointerNo, scoreObtained: number, maxScore?: number) => Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=ivyScore.service.d.ts.map