import mongoose from 'mongoose';
import StudentPointerScore from '../models/ivy/StudentPointerScore';
import StudentIvyScoreCard from '../models/ivy/StudentIvyScoreCard';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Student from '../models/Student';
import Service from '../models/Service';
import { PointerNo } from '../types/PointerNo';

/** Helper: get the Ivy League service ObjectId (cached per process) */
let _ivyServiceId: mongoose.Types.ObjectId | null = null;
const getIvyLeagueServiceId = async (): Promise<mongoose.Types.ObjectId | null> => {
  if (_ivyServiceId) return _ivyServiceId;
  const svc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
  if (svc) _ivyServiceId = svc._id as mongoose.Types.ObjectId;
  return _ivyServiceId;
};

/**
 * Resolve an ID (which could be User._id or Student._id) to a Student document.
 * First tries Student.findById (if it's a Student._id),
 * then falls back to Student.findOne({ userId }) (if it's a User._id).
 */
const resolveStudent = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    // Try as Student._id first
    let student = await Student.findById(id);
    if (student) return student;
    // Fallback: treat as User._id
    student = await Student.findOne({ userId: id });
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
export const calculateIvyScore = async (studentUserId: string, studentIvyServiceId?: string) => {
    try {
        let studentService;

        // If studentIvyServiceId is provided, use it directly (avoids wrong registration for multi-service students)
        if (studentIvyServiceId && mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
            studentService = await StudentServiceRegistration.findById(studentIvyServiceId);
        }

        // Fallback: resolve student and find Ivy League registration
        if (!studentService) {
            const student = await resolveStudent(studentUserId);
            if (!student) {
                throw new Error('Student record not found');
            }

            const ivyServiceId = await getIvyLeagueServiceId();
            const filter: any = { studentId: student._id };
            if (ivyServiceId) filter.serviceId = ivyServiceId;
            studentService = await StudentServiceRegistration.findOne(filter);
        }

        if (!studentService) {
            throw new Error('Student not enrolled in Ivy service');
        }

        // Get all pointer scores for this student
        const pointerScores = await StudentPointerScore.find({
            studentIvyServiceId: studentService._id,
        });

        // Initialize all 6 pointers with 0 score and max 10
        const allPointers = [
            PointerNo.AcademicExcellence,
            PointerNo.SpikeInOneArea,
            PointerNo.LeadershipInitiative,
            PointerNo.GlobalSocialImpact,
            PointerNo.AuthenticStorytelling,
            PointerNo.IntellectualCuriosity,
        ];

        // Define weightages for each pointer (total = 100%)
        const pointerWeightages = new Map<PointerNo, number>([
            [PointerNo.AcademicExcellence, 30],        // 30%
            [PointerNo.SpikeInOneArea, 20],            // 20%
            [PointerNo.LeadershipInitiative, 15],      // 15%
            [PointerNo.GlobalSocialImpact, 10],        // 10%
            [PointerNo.AuthenticStorytelling, 15],     // 15%
            [PointerNo.IntellectualCuriosity, 10],     // 10%
        ]);

        const scoreMap = new Map<PointerNo, { score: number; maxScore: number }>();

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
            const scoreData = scoreMap.get(pointer)!;
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
        const scoreCard = await StudentIvyScoreCard.findOneAndUpdate(
            { studentIvyServiceId: studentService._id },
            {
                studentIvyServiceId: studentService._id,
                pointerScores: formattedScores,
                overallScore: Math.round(totalScore * 100) / 100, // Round to 2 decimals
                generatedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // SYNC: Update the main service registration with the overall score
        await StudentServiceRegistration.findByIdAndUpdate(studentService._id, {
            overallScore: Math.round(totalScore * 100) / 100,
            updatedAt: new Date()
        });

        return scoreCard;
    } catch (error) {
        console.error('Error calculating Ivy score:', error);
        throw error;
    }
};

/**
 * Get Ivy score for a student
 */
export const getIvyScore = async (studentUserId: string, studentIvyServiceId?: string) => {
    try {
        let studentService;

        // If studentIvyServiceId is provided, use it directly (avoids wrong registration for multi-service students)
        if (studentIvyServiceId && mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
            studentService = await StudentServiceRegistration.findById(studentIvyServiceId);
        }

        // Fallback: resolve student and find Ivy League registration
        if (!studentService) {
            const student = await resolveStudent(studentUserId);
            if (!student) {
                throw new Error('Student record not found');
            }

            const ivyServiceId = await getIvyLeagueServiceId();
            const filter: any = { studentId: student._id };
            if (ivyServiceId) filter.serviceId = ivyServiceId;
            studentService = await StudentServiceRegistration.findOne(filter);
        }

        if (!studentService) {
            throw new Error('Student not enrolled in Ivy service');
        }

        // Try to get existing scorecard
        let scoreCard = await StudentIvyScoreCard.findOne({
            studentIvyServiceId: studentService._id,
        }).populate('studentIvyServiceId');

        // If no scorecard exists, calculate it
        if (!scoreCard) {
            scoreCard = await calculateIvyScore(studentUserId, studentIvyServiceId);
        }

        return scoreCard;
    } catch (error) {
        console.error('Error getting Ivy score:', error);
        throw error;
    }
};

/**
 * Update score after evaluation submission
 * This should be called whenever a pointer evaluation is submitted
 */
export const updateScoreAfterEvaluation = async (
    studentIvyServiceId: string,
    pointerNo: PointerNo,
    scoreObtained: number,
    maxScore: number = 10
) => {
    try {
        // Update or create the pointer score
        await StudentPointerScore.findOneAndUpdate(
            { studentIvyServiceId, pointerNo },
            {
                studentIvyServiceId,
                pointerNo,
                scoreObtained,
                maxScore,
                lastUpdated: new Date(),
            },
            { upsert: true, new: true }
        );

        // Get student ID from service registration
        const studentService = await StudentServiceRegistration.findById(studentIvyServiceId)
            .populate('studentId', 'userId');
        if (!studentService) {
            throw new Error('Student service not found');
        }

        // Get the User._id from the Student record
        const studentUserId = (studentService.studentId as any)?.userId?.toString() || '';

        // Recalculate total score (pass studentIvyServiceId to avoid ambiguous lookup)
        await calculateIvyScore(studentUserId, studentIvyServiceId);

        return { success: true, message: 'Score updated successfully' };
    } catch (error) {
        console.error('Error updating score after evaluation:', error);
        throw error;
    }
};
