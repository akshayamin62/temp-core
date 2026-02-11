"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteActivity = exports.getActivityById = exports.getActivities = exports.createActivity = exports.activityFileUploadMiddleware = void 0;
const AgentSuggestion_1 = __importDefault(require("../models/ivy/AgentSuggestion"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir_1 = require("../utils/uploadDir");
// Configure multer for Word document uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only Word documents (.doc, .docx) are allowed'));
        }
    },
});
exports.activityFileUploadMiddleware = upload.single('document');
// Create a new activity
const createActivity = async (req, res) => {
    try {
        const { name, description, pointerNo } = req.body;
        if (!name || !description || !pointerNo) {
            res.status(400).json({
                success: false,
                message: 'Activity name, description, and pointer number are required',
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Document file is required',
            });
            return;
        }
        // Validate pointer number
        const pointer = parseInt(pointerNo);
        if (![2, 3, 4].includes(pointer)) {
            res.status(400).json({
                success: false,
                message: 'Pointer number must be 2, 3, or 4',
            });
            return;
        }
        // Save file to disk with pointer-wise folder structure
        const uploadDir = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'activities', pointer.toString());
        (0, uploadDir_1.ensureDir)(uploadDir);
        const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path_1.default.join(uploadDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        // Save to AgentSuggestion table with SUPERADMIN source
        const activity = new AgentSuggestion_1.default({
            pointerNo: pointer,
            title: name,
            description: description,
            tags: [],
            source: 'SUPERADMIN',
            documentUrl: `/uploads/activities/${pointer}/${fileName}`,
            documentName: req.file.originalname,
        });
        await activity.save();
        res.json({
            success: true,
            message: 'Activity created successfully',
            data: activity,
        });
    }
    catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create activity',
        });
    }
};
exports.createActivity = createActivity;
// Get all activities
const getActivities = async (req, res) => {
    try {
        const { pointerNo } = req.query;
        const filter = { source: 'SUPERADMIN' };
        if (pointerNo) {
            filter.pointerNo = parseInt(pointerNo);
        }
        const activities = await AgentSuggestion_1.default.find(filter).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: activities,
        });
    }
    catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch activities',
        });
    }
};
exports.getActivities = getActivities;
// Get activity by ID
const getActivityById = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await AgentSuggestion_1.default.findById(id);
        if (!activity) {
            res.status(404).json({
                success: false,
                message: 'Activity not found',
            });
            return;
        }
        res.json({
            success: true,
            data: activity,
        });
    }
    catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch activity',
        });
    }
};
exports.getActivityById = getActivityById;
// Delete activity
const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await AgentSuggestion_1.default.findById(id);
        if (!activity) {
            res.status(404).json({
                success: false,
                message: 'Activity not found',
            });
            return;
        }
        // Delete file from disk
        if (activity.documentUrl) {
            const filePath = path_1.default.join(process.cwd(), activity.documentUrl);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await AgentSuggestion_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Activity deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete activity',
        });
    }
};
exports.deleteActivity = deleteActivity;
//# sourceMappingURL=activity.controller.js.map