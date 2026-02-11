import { Request, Response } from 'express';
import AgentSuggestion from '../models/ivy/AgentSuggestion';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// Configure multer for Word document uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Word documents (.doc, .docx) are allowed'));
    }
  },
});

export const activityFileUploadMiddleware = upload.single('document');

// Create a new activity
export const createActivity = async (req: Request, res: Response): Promise<void> => {
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
    const uploadDir = path.join(getUploadBaseDir(), 'activities', pointer.toString());
    ensureDir(uploadDir);

    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Save to AgentSuggestion table with SUPERADMIN source
    const activity = new AgentSuggestion({
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
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create activity',
    });
  }
};

// Get all activities
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pointerNo } = req.query;

    const filter: any = { source: 'SUPERADMIN' };
    if (pointerNo) {
      filter.pointerNo = parseInt(pointerNo as string);
    }

    const activities = await AgentSuggestion.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activities',
    });
  }
};

// Get activity by ID
export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const activity = await AgentSuggestion.findById(id);

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
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activity',
    });
  }
};

// Delete activity
export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const activity = await AgentSuggestion.findById(id);

    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    // Delete file from disk
    if (activity.documentUrl) {
      const filePath = path.join(process.cwd(), activity.documentUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await AgentSuggestion.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete activity',
    });
  }
};
