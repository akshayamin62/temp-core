import { Request, Response } from 'express';
import { getIvyExpertPerformance } from '../services/ivyExpertPerformance.service';

export const getIvyExpertPerformanceHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        // Ideally ensure user is ADMIN here, but we'll rely on route middleware or assume role check
        const metrics = await getIvyExpertPerformance();

        res.status(200).json({
            success: true,
            message: 'Ivy Expert performance metrics retrieved successfully',
            data: metrics,
        });
    } catch (error: any) {
        console.error('Error fetching Ivy Expert performance:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Ivy Expert performance',
        });
    }
};
