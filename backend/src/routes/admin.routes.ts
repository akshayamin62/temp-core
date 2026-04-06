import express from 'express';
import { getIvyExpertPerformanceHandler } from '../controllers/ivyExpertPerformance.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = express.Router();

// GET /admin/ivy-expert/performance (SUPER_ADMIN only — currently unused by frontend)
router.get('/ivy-expert/performance', authorize(USER_ROLE.SUPER_ADMIN), getIvyExpertPerformanceHandler);

export default router;
