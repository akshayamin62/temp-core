import { Router } from 'express';
import { uploadExcelFile, uploadMiddleware } from '../controllers/excelUpload.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// POST /api/excel-upload - Upload and parse Excel file (IVY_EXPERT only)
router.post('/', authorize(USER_ROLE.IVY_EXPERT), uploadMiddleware, uploadExcelFile);

export default router;

