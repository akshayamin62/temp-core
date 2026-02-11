"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateScoreAfterEvaluation = exports.getIvyScore = exports.calculateIvyScore = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StudentPointerScore_1 = __importDefault(require("../models/ivy/StudentPointerScore"));
const StudentIvyScoreCard_1 = __importDefault(require("../models/ivy/StudentIvyScoreCard"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const Student_1 = __importDefault(require("../models/Student"));
const Service_1 = __importDefault(require("../models/Service"));
const PointerNo_1 = require("../types/PointerNo");
/** Helper: get the Ivy League service ObjectId (cached per process) */
let _ivyServiceId = null;
const getIvyLeagueServiceId = async () => {
    if (_ivyServiceId)
        return _ivyServiceId;
    const svc = await Service_1.default.findOne({ slug: 'ivy-league' }).select('_id');
    if (svc)
        _ivyServiceId = svc._id;
    return _ivyServiceId;
};
/**
 * Resolve an ID (which could be User._id or Student._id) to a Student document.
 * First tries Student.findById (if it's a Student._id),
 * then falls back to Student.findOne({ userId }) (if it's a User._id).
 */
const resolveStudent = async (id) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        return null;
    // Try as Student._id first
    let student = await Student_1.default.findById(id);
    if (student)
        return student;
    // Fallback: treat as User._id
    student = await Student_1.default.findOne({ userId: id });
    return student;
};
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
const calculateIvyScore = async (studentUserId, studentIvyServiceId) => {
    try {
        let studentService;
        // If studentIvyServiceId is provided, use it directly (avoids wrong registration for multi-service students)
        if (studentIvyServiceId && mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
            studentService = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
        }
        // Fallback: resolve student and find Ivy League registration
        if (!studentService) {
            const student = await resolveStudent(studentUserId);
            if (!student) {
                throw new Error('Student record not found');
            }
            const ivyServiceId = await getIvyLeagueServiceId();
            const filter = { studentId: student._id };
            if (ivyServiceId)
                filter.serviceId = ivyServiceId;
            studentService = await StudentServiceRegistration_1.default.findOne(filter);
        }
        if (!studentService) {
            throw new Error('Student not enrolled in Ivy service');
        }
        // Get all pointer scores for this student
        const pointerScores = await StudentPointerScore_1.default.find({
            studentIvyServiceId: studentService._id,
        });
        // Initialize all 6 pointers with 0 score and max 10
        const allPointers = [
            PointerNo_1.PointerNo.AcademicExcellence,
            PointerNo_1.PointerNo.SpikeInOneArea,
            PointerNo_1.PointerNo.LeadershipInitiative,
            PointerNo_1.PointerNo.GlobalSocialImpact,
            PointerNo_1.PointerNo.AuthenticStorytelling,
            PointerNo_1.PointerNo.IntellectualCuriosity,
        ];
        // Define weightages for each pointer (total = 100%)
        const pointerWeightages = new Map([
            [PointerNo_1.PointerNo.AcademicExcellence, 30], // 30%
            [PointerNo_1.PointerNo.SpikeInOneArea, 20], // 20%
            [PointerNo_1.PointerNo.LeadershipInitiative, 15], // 15%
            [PointerNo_1.PointerNo.GlobalSocialImpact, 10], // 10%
            [PointerNo_1.PointerNo.AuthenticStorytelling, 15], // 15%
            [PointerNo_1.PointerNo.IntellectualCuriosity, 10], // 10%
        ]);
        const scoreMap = new Map();
        // Initialize all pointers with 0
        allPointers.forEach(pointer => {
            scoreMap.set(pointer, { score: 0, maxScore: 10 });
        });
        // Update with actual scores
        pointerScores.forEach(ps => {
            // Normalize score to 0-10 scale
            const normalizedScore = (ps.scoreObtained / ps.maxScore) * 10;
            scoreMap.set(ps.pointerNo, {
                score: Math.min(10, Math.max(0, normalizedScore)), // Clamp between 0-10
                maxScore: 10,
            });
        });
        // Build pointer scores array
        const formattedScores = allPointers.map(pointer => {
            const scoreData = scoreMap.get(pointer);
            return {
                pointerNo: pointer,
                score: Math.round(scoreData.score * 100) / 100, // Round to 2 decimals
                maxScore: scoreData.maxScore,
            };
        });
        // Calculate weighted total score (out of 10)
        // Formula: (weightage/100) × score for each pointer
        let totalScore = 0;
        formattedScores.forEach(ps => {
            const weightage = pointerWeightages.get(ps.pointerNo) || 0;
            totalScore += (weightage / 100) * ps.score;
        });
        // Update or create scorecard
        const scoreCard = await StudentIvyScoreCard_1.default.findOneAndUpdate({ studentIvyServiceId: studentService._id }, {
            studentIvyServiceId: studentService._id,
            pointerScores: formattedScores,
            overallScore: Math.round(totalScore * 100) / 100, // Round to 2 decimals
            generatedAt: new Date(),
        }, { upsert: true, new: true });
        // SYNC: Update the main service registration with the overall score
        await StudentServiceRegistration_1.default.findByIdAndUpdate(studentService._id, {
            overallScore: Math.round(totalScore * 100) / 100,
            updatedAt: new Date()
        });
        return scoreCard;
    }
    catch (error) {
        console.error('Error calculating Ivy score:', error);
        throw error;
    }
};
exports.calculateIvyScore = calculateIvyScore;
/**
 * Get Ivy score for a student
 */
const getIvyScore = async (studentUserId, studentIvyServiceId) => {
    try {
        let studentService;
        // If studentIvyServiceId is provided, use it directly (avoids wrong registration for multi-service students)
        if (studentIvyServiceId && mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
            studentService = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
        }
        // Fallback: resolve student and find Ivy League registration
        if (!studentService) {
            const student = await resolveStudent(studentUserId);
            if (!student) {
                throw new Error('Student record not found');
            }
            const ivyServiceId = await getIvyLeagueServiceId();
            const filter = { studentId: student._id };
            if (ivyServiceId)
                filter.serviceId = ivyServiceId;
            studentService = await StudentServiceRegistration_1.default.findOne(filter);
        }
        if (!studentService) {
            throw new Error('Student not enrolled in Ivy service');
        }
        // Try to get existing scorecard
        let scoreCard = await StudentIvyScoreCard_1.default.findOne({
            studentIvyServiceId: studentService._id,
        }).populate('studentIvyServiceId');
        // If no scorecard exists, calculate it
        if (!scoreCard) {
            scoreCard = await (0, exports.calculateIvyScore)(studentUserId, studentIvyServiceId);
        }
        return scoreCard;
    }
    catch (error) {
        console.error('Error getting Ivy score:', error);
        throw error;
    }
};
exports.getIvyScore = getIvyScore;
/**
 * Update score after evaluation submission
 * This should be called whenever a pointer evaluation is submitted
 */
const updateScoreAfterEvaluation = async (studentIvyServiceId, pointerNo, scoreObtained, maxScore = 10) => {
    try {
        // Update or create the pointer score
        await StudentPointerScore_1.default.findOneAndUpdate({ studentIvyServiceId, pointerNo }, {
            studentIvyServiceId,
            pointerNo,
            scoreObtained,
            maxScore,
            lastUpdated: new Date(),
        }, { upsert: true, new: true });
        // Get student ID from service registration
        const studentService = await StudentServiceRegistration_1.default.findById(studentIvyServiceId)
            .populate('studentId', 'userId');
        if (!studentService) {
            throw new Error('Student service not found');
        }
        // Get the User._id from the Student record
        const studentUserId = studentService.studentId?.userId?.toString() || '';
        // Recalculate total score (pass studentIvyServiceId to avoid ambiguous lookup)
        await (0, exports.calculateIvyScore)(studentUserId, studentIvyServiceId);
        return { success: true, message: 'Score updated successfully' };
    }
    catch (error) {
        console.error('Error updating score after evaluation:', error);
        throw error;
    }
};
exports.updateScoreAfterEvaluation = updateScoreAfterEvaluation;
//# sourceMappingURL=ivyScore.service.js.map