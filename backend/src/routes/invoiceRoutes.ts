import { Router } from 'express';
import {
  getInvoicesByRegistration,
  getInvoicesByStudent,
  getInvoice,
  getInvoiceByNumber,
} from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get invoices by registration
router.get('/registration/:registrationId', authenticate, getInvoicesByRegistration);

// Get invoices by student
router.get('/student/:studentId', authenticate, getInvoicesByStudent);

// Get invoice by number
router.get('/number/:invoiceNumber', authenticate, getInvoiceByNumber);

// Get single invoice by ID
router.get('/:invoiceId', authenticate, getInvoice);

export default router;
