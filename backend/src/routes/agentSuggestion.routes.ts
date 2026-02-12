import { Router } from 'express';
import { getAgentSuggestionsHandler } from '../controllers/agentSuggestion.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// GET /api/agent-suggestions?studentIvyServiceId=xxx&pointerNo=2&limit=10
// Get ranked agent suggestions based on student interest
router.get('/', authorize(USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN), getAgentSuggestionsHandler);

export default router;

