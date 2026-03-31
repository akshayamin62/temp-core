import { Router } from 'express';
import {
  getLedgerByRegistration,
  getLedgersByStudent,
} from '../controllers/ledgerController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get ledger by registration
router.get('/registration/:registrationId', authenticate, getLedgerByRegistration);

// Get all ledgers for a student
router.get('/student/:studentId', authenticate, getLedgersByStudent);

export default router;
