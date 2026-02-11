"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMulterError = exports.uploadAdminLogo = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uploadDir_1 = require("../utils/uploadDir");
// Simple storage - files go to a common uploads folder
// Controller will organize them into student folders
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadsDir = (0, uploadDir_1.getUploadBaseDir)();
        (0, uploadDir_1.ensureDir)(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const filename = `temp_${timestamp}_${file.originalname}`;
        cb(null, filename);
    },
});
// File filter - only allow specific file types
const fileFilter = (_req, file, cb) => {
    const allowedMimes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed."));
    }
};
// Configure multer
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
});
// Admin logo upload - only images
const adminLogoStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadsDir = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'admin');
        (0, uploadDir_1.ensureDir)(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        const filename = `logo_${timestamp}${ext}`;
        cb(null, filename);
    },
});
const imageFilter = (_req, file, cb) => {
    const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file type. Only images (JPG, PNG, GIF, WEBP) are allowed."));
    }
};
exports.uploadAdminLogo = (0, multer_1.default)({
    storage: adminLogoStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max for logos
    },
});
// Error handler for multer errors
const handleMulterError = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size exceeds 10MB limit",
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }
    else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }
    next();
};
exports.handleMulterError = handleMulterError;
//# sourceMappingURL=upload.js.map