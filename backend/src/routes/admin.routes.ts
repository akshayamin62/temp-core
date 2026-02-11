import express from 'express';
import { getIvyExpertPerformanceHandler } from '../controllers/ivyExpertPerformance.controller';

const router = express.Router();

// GET /admin/ivy-expert/performance
router.get('/ivy-expert/performance', getIvyExpertPerformanceHandler);

export default router;
