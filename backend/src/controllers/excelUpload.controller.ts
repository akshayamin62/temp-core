import { Request, Response } from 'express';
import multer from 'multer';
import {
  getPointerNoFromFilename,
  parseExcelFile,
  saveAgentSuggestions,
} from '../services/excelParser.service';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx) are allowed'));
    }
  },
});

export const uploadMiddleware = upload.single('excelFile');

export const uploadExcelFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const filename = req.file.originalname;
    const pointerNo = getPointerNoFromFilename(filename);

    // Reject if filename doesn't match allowed names
    if (!pointerNo) {
      res.status(400).json({
        success: false,
        message: `Invalid filename. Allowed files: "Spike in One area.xlsx", "Leadership & Initiative.xlsx", "Global & Social Impact.xlsx"`,
      });
      return;
    }

    // Parse Excel file
    const rows = parseExcelFile(req.file.buffer);

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Excel file is empty or could not be parsed',
      });
      return;
    }

    // Check if overwrite is requested (from query parameter or body)
    const overwriteParam = req.query.overwrite;
    const overwrite = 
      (typeof overwriteParam === 'string' && overwriteParam === 'true') ||
      req.body.overwrite === true;
    
    // Debug logging
    console.log('Upload request:', {
      filename,
      pointerNo,
      totalRows: rows.length,
      overwrite,
      queryParams: req.query,
    });

    // Save to database (prevent duplicates unless overwrite is true)
    const result = await saveAgentSuggestions(rows, pointerNo, overwrite);

    res.status(200).json({
      success: true,
      message: `Excel file processed successfully`,
      data: {
        pointerNo,
        filename,
        totalRows: rows.length,
        created: result.created,
        updated: result.updated || 0,
        skipped: result.skipped,
      },
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    const errorMessage = error.message || 'Failed to process Excel file';
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

