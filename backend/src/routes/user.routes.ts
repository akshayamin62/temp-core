import { Router } from 'express';
import { getUsers } from '../controllers/user.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// GET /api/users?role=student or ivy-expert (SUPER_ADMIN only — currently unused by frontend)
router.get('/', authorize(USER_ROLE.SUPER_ADMIN), getUsers);

export default router;

