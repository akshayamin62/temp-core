import { Router } from 'express';
import { uploadExcelFile, uploadMiddleware } from '../controllers/excelUpload.controller';

const router = Router();

// POST /api/excel-upload - Upload and parse Excel file (Admin only)
router.post('/', uploadMiddleware, uploadExcelFile);

export default router;

