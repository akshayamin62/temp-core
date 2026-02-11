import { Router } from 'express';
import { getUsers } from '../controllers/user.controller';

const router = Router();

// GET /api/users?role=student or ivy-expert
router.get('/', getUsers);

export default router;

