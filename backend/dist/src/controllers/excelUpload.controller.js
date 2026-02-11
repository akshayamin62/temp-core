"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadExcelFile = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const excelParser_service_1 = require("../services/excelParser.service");
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel files (.xlsx) are allowed'));
        }
    },
});
exports.uploadMiddleware = upload.single('excelFile');
const uploadExcelFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
            return;
        }
        const filename = req.file.originalname;
        const pointerNo = (0, excelParser_service_1.getPointerNoFromFilename)(filename);
        // Reject if filename doesn't match allowed names
        if (!pointerNo) {
            res.status(400).json({
                success: false,
                message: `Invalid filename. Allowed files: "Spike in One area.xlsx", "Leadership & Initiative.xlsx", "Global & Social Impact.xlsx"`,
            });
            return;
        }
        // Parse Excel file
        const rows = (0, excelParser_service_1.parseExcelFile)(req.file.buffer);
        if (rows.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Excel file is empty or could not be parsed',
            });
            return;
        }
        // Check if overwrite is requested (from query parameter or body)
        const overwriteParam = req.query.overwrite;
        const overwrite = (typeof overwriteParam === 'string' && overwriteParam === 'true') ||
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
        const result = await (0, excelParser_service_1.saveAgentSuggestions)(rows, pointerNo, overwrite);
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
    }
    catch (error) {
        console.error('Excel upload error:', error);
        const errorMessage = error.message || 'Failed to process Excel file';
        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};
exports.uploadExcelFile = uploadExcelFile;
//# sourceMappingURL=excelUpload.controller.js.map