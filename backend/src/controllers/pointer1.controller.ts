import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveIvyExpertId } from '../utils/resolveRole';
import { USER_ROLE } from '../types/roles';
import multer from 'multer';
import {
    uploadAcademicDocument,
    evaluateAcademicDocument,
    getAcademicStatus,
    getAcademicData,
    addSection,
    addSubSection,
    updateSubSection,
    addSubject,
    updateSubject,
    deleteSection,
    deleteSubSection,
    deleteSubject,
    updateWeightages,
    getAcademicExcellenceScore,
} from '../services/pointer1.service';
import { AcademicDocumentType } from '../types/AcademicDocumentType';

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const academicUploadMiddleware = upload.single('document');

export const uploadAcademicDocumentHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[P1-Controller] Body:', req.body);
        console.log('[P1-Controller] File:', req.file ? req.file.originalname : 'MISSING');
        const { studentIvyServiceId, documentType, studentId, customLabel } = req.body;
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }

        if (!studentIvyServiceId || !documentType || !studentId) {
            res.status(400).json({ success: false, message: 'All fields are required' });
            return;
        }

        // Validate documentType
        if (!Object.values(AcademicDocumentType).includes(documentType as AcademicDocumentType)) {
            res.status(400).json({ success: false, message: 'Invalid document type' });
            return;
        }

        const doc = await uploadAcademicDocument(
            studentIvyServiceId,
            studentId,
            documentType as AcademicDocumentType,
            file,
            customLabel
        );

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: doc,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const evaluateAcademicHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentIvyServiceId, academicDocumentId, score, feedback, ivyExpertId: bodyIvyExpertId } = req.body;
        const authUser = (req as AuthRequest).user!;
        let ivyExpertId: string;
        if (authUser.role === USER_ROLE.SUPER_ADMIN) {
            ivyExpertId = bodyIvyExpertId || authUser.userId;
        } else {
            ivyExpertId = await resolveIvyExpertId(authUser.userId);
        }

        if (!studentIvyServiceId || !academicDocumentId || score === undefined) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const evaluation = await evaluateAcademicDocument(
            studentIvyServiceId,
            academicDocumentId,
            ivyExpertId,
            Number(score),
            feedback
        );

        res.status(200).json({
            success: true,
            message: 'Evaluation saved successfully',
            data: evaluation,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAcademicStatusHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;

        const identifier = studentIvyServiceId ? (studentIvyServiceId as string) : (studentId as string);
        const useServiceId = !!studentIvyServiceId;

        if (!identifier) {
            res.status(400).json({ success: false, message: 'ID required' });
            return;
        }

        const data = await getAcademicStatus(identifier, useServiceId);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ========================
// Academic Data Handlers
// ========================

export const getAcademicDataHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const studentId = req.params.studentId as string;
        const studentIvyServiceId = req.query.studentIvyServiceId as string;

        if (!studentId || !studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentId and studentIvyServiceId required' });
            return;
        }

        const data = await getAcademicData(studentId, studentIvyServiceId);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addSectionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, examName, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !examName) {
            res.status(400).json({ success: false, message: 'All fields required' });
            return;
        }

        const data = await addSection(studentId, studentIvyServiceId, examName, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addSubSectionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, testType, month, year, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await addSubSection(
            studentId, 
            studentIvyServiceId, 
            sectionId, 
            testType || (tab === 'informal' ? 'olympiad' : 'weekly'),
            month || 'January',
            year || new Date().getFullYear(),
            tab || 'formal'
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateSubSectionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, tab, ...updates } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await updateSubSection(studentId, studentIvyServiceId, sectionId, subSectionId, updates, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addSubjectHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, name, marksObtained, totalMarks, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await addSubject(
            studentId,
            studentIvyServiceId,
            sectionId,
            subSectionId,
            name || '',
            marksObtained || 0,
            totalMarks || 100,
            tab || 'formal'
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateSubjectHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab, ...updates } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId || !subjectId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await updateSubject(studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, updates, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteSectionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await deleteSection(studentId, studentIvyServiceId, sectionId, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteSubSectionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await deleteSubSection(studentId, studentIvyServiceId, sectionId, subSectionId, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteSubjectHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab } = req.body;

        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId || !subjectId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await deleteSubject(studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab || 'formal');

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateWeightagesHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, studentIvyServiceId, weightages } = req.body;

        if (!studentId || !studentIvyServiceId || !weightages) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const data = await updateWeightages(studentId, studentIvyServiceId, weightages);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAcademicExcellenceScoreHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const studentId = String(req.params.studentId || '');
        const studentIvyServiceId = String(req.query.studentIvyServiceId || '');

        if (!studentId || !studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }

        const scoreData = await getAcademicExcellenceScore(studentId, studentIvyServiceId);

        res.status(200).json({
            success: true,
            data: scoreData,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};
