import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getIvyScore, calculateIvyScore } from '../services/ivyScore.service';
import { getServiceByStudentId } from '../services/ivyService.service';

/**
 * GET /api/ivy-score/:studentId
 * Get Ivy readiness score for a student
 */
export const getStudentIvyScore = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }

        const scoreCard = await getIvyScore(studentId as string, studentIvyServiceId as string | undefined);

        return res.status(200).json({
            success: true,
            data: scoreCard,
        });
    } catch (error: any) {
        console.error('Error fetching Ivy score:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Ivy score',
        });
    }
};

/**
 * POST /api/ivy-score/recalculate/:studentId
 * Manually recalculate Ivy score for a student
 */
/**
 * GET /api/ivy/ivy-score/my-score
 * Auth-based: get the logged-in student's ivy score
 */
export const getMyIvyScore = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.userId;
        // Resolve the correct Ivy League service registration for this student
        const service = await getServiceByStudentId(userId);
        const studentIvyServiceId = service?._id?.toString();
        const scoreCard = await getIvyScore(userId, studentIvyServiceId);
        return res.status(200).json({ success: true, data: scoreCard });
    } catch (error: any) {
        console.error('Error fetching my Ivy score:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch Ivy score' });
    }
};

export const recalculateIvyScore = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }

        const scoreCard = await calculateIvyScore(studentId as string, studentIvyServiceId as string | undefined);

        return res.status(200).json({
            success: true,
            message: 'Score recalculated successfully',
            data: scoreCard,
        });
    } catch (error: any) {
        console.error('Error recalculating Ivy score:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to recalculate Ivy score',
        });
    }
};
