import { Router } from 'express';
import {
  getBatches,
  getAllBatches,
  createBatch,
  updateBatch,
  deleteBatch,
} from '../controllers/coachingBatchController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Public/any authenticated user - get active batches (optionally filtered by planKey)
router.get('/', authenticate, getBatches);

// Super Admin / Admin - get all batches including inactive
router.get('/all', authenticate, authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.ADVISORY]), getAllBatches);

// Super Admin - create batch
router.post('/', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), createBatch);

// Super Admin - update batch
router.put('/:batchId', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), updateBatch);

// Super Admin - delete batch
router.delete('/:batchId', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), deleteBatch);

export default router;
