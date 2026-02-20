import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import StudentDocument, { DocumentCategory, DocumentStatus, UploaderRole } from '../models/StudentDocument';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import EduplanCoach from '../models/EduplanCoach';
import Student from '../models/Student';
import User from '../models/User';
import { USER_ROLE } from '../types/roles';
import fs from 'fs';
import path from 'path';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

const BRAINOGRAPHY_DOC_KEY = 'brainography_report';
const BRAINOGRAPHY_DOC_NAME = 'Brainography Report';

/**
 * Upload brainography report (Eduplan Coach only)
 */
export const uploadBrainography = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const file = req.file;
    const userId = req.user?.userId;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name')
      .lean()
      .exec();

    if (!registration) {
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Verify it's an Education Planning registration
    const serviceName = (registration.serviceId as any)?.name;
    if (serviceName !== 'Education Planning') {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: 'Brainography report can only be uploaded for Education Planning registrations',
      });
    }

    // Verify user is EDUPLAN_COACH or SUPER_ADMIN
    const userRole = req.user?.role;
    if (userRole === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId });
      if (!coach) {
        fs.unlinkSync(file.path);
        return res.status(404).json({
          success: false,
          message: 'Eduplan Coach record not found',
        });
      }

      const activeCoachId = registration.activeEduplanCoachId || registration.primaryEduplanCoachId;
      const activeCoachIdStr = activeCoachId?.toString();
      if (activeCoachIdStr !== coach._id.toString()) {
        fs.unlinkSync(file.path);
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active Eduplan Coach for this registration.',
        });
      }
    } else if (userRole !== USER_ROLE.SUPER_ADMIN) {
      fs.unlinkSync(file.path);
      return res.status(403).json({
        success: false,
        message: 'Only Eduplan Coach or Super Admin can upload brainography reports',
      });
    }

    const studentId = registration.studentId;

    // Create student directory
    const studentDir = path.join(getUploadBaseDir(), studentId.toString());
    ensureDir(studentDir);

    // Generate final filename and move file
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `${BRAINOGRAPHY_DOC_KEY}_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(studentDir, finalFilename);

    fs.renameSync(file.path, finalPath);

    // Check for existing brainography doc and replace
    const existingDoc = await StudentDocument.findOne({
      registrationId,
      documentKey: BRAINOGRAPHY_DOC_KEY,
    });

    let document;

    if (existingDoc) {
      // Delete old file
      const oldFilePath = path.join(process.cwd(), existingDoc.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      existingDoc.fileName = finalFilename;
      existingDoc.filePath = `uploads/${studentId}/${finalFilename}`;
      existingDoc.fileSize = file.size;
      existingDoc.mimeType = file.mimetype;
      existingDoc.uploadedAt = new Date();
      existingDoc.uploadedBy = new mongoose.Types.ObjectId(userId!);
      existingDoc.uploadedByRole = (userRole === 'SUPER_ADMIN' ? UploaderRole.SUPER_ADMIN : UploaderRole.EDUPLAN_COACH) as any;
      existingDoc.status = DocumentStatus.APPROVED;
      existingDoc.version += 1;
      existingDoc.approvedBy = new mongoose.Types.ObjectId(userId!);
      existingDoc.approvedAt = new Date();

      document = await existingDoc.save();
    } else {
      document = await StudentDocument.create({
        registrationId,
        studentId,
        documentCategory: DocumentCategory.PRIMARY,
        documentName: BRAINOGRAPHY_DOC_NAME,
        documentKey: BRAINOGRAPHY_DOC_KEY,
        fileName: finalFilename,
        filePath: `uploads/${studentId}/${finalFilename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new mongoose.Types.ObjectId(userId!),
        uploadedByRole: userRole === 'SUPER_ADMIN' ? UploaderRole.SUPER_ADMIN : UploaderRole.EDUPLAN_COACH,
        status: DocumentStatus.APPROVED,
        isCustomField: false,
        version: 1,
        approvedBy: new mongoose.Types.ObjectId(userId!),
        approvedAt: new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Brainography report uploaded successfully',
      data: { document },
    });
  } catch (error: any) {
    console.error('Brainography upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload brainography report',
    });
  }
};

/**
 * Get brainography report for a registration
 */
export const getBrainography = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    const document = await StudentDocument.findOne({
      registrationId,
      documentKey: BRAINOGRAPHY_DOC_KEY,
    })
      .populate('uploadedBy', 'firstName middleName lastName email')
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: document ? 'Brainography report found' : 'No brainography report uploaded yet',
      data: { document },
    });
  } catch (error: any) {
    console.error('Get brainography error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch brainography report',
    });
  }
};

/**
 * Download brainography report
 */
export const downloadBrainography = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { registrationId } = req.params;

    const document = await StudentDocument.findOne({
      registrationId,
      documentKey: BRAINOGRAPHY_DOC_KEY,
    }).lean().exec();

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Brainography report not found',
      });
      return;
    }

    const filePath = path.join(process.cwd(), document.filePath);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
      return;
    }

    res.download(filePath, document.fileName);
  } catch (error: any) {
    console.error('Download brainography error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download brainography report',
    });
  }
};

/**
 * Delete brainography report (Eduplan Coach or Super Admin)
 */
export const deleteBrainography = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    const document = await StudentDocument.findOne({
      registrationId,
      documentKey: BRAINOGRAPHY_DOC_KEY,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Brainography report not found',
      });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await StudentDocument.deleteOne({ _id: document._id });

    return res.status(200).json({
      success: true,
      message: 'Brainography report deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete brainography error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete brainography report',
    });
  }
};
