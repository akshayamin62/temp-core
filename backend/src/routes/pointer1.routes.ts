import { Router } from 'express';
import {
    uploadAcademicDocumentHandler,
    academicUploadMiddleware,
    evaluateAcademicHandler,
    getAcademicStatusHandler,
    getAcademicDataHandler,
    addSectionHandler,
    addSubSectionHandler,
    updateSubSectionHandler,
    addSubjectHandler,
    updateSubjectHandler,
    addProjectHandler,
    updateProjectHandler,
    deleteSectionHandler,
    deleteSubSectionHandler,
    deleteSubjectHandler,
    deleteProjectHandler,
    updateWeightagesHandler,
    getAcademicExcellenceScoreHandler,
} from '../controllers/pointer1.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// POST /api/pointer1/upload - Student uploads a document
router.post('/upload', authorize(USER_ROLE.STUDENT), academicUploadMiddleware, uploadAcademicDocumentHandler);

// POST /api/pointer1/evaluate - Ivy Expert evaluates Pointer 1
router.post('/evaluate', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), evaluateAcademicHandler);

// GET /api/pointer1/status/:studentId - Get status and documents
router.get('/status/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getAcademicStatusHandler);

// ========================
// Academic Data Routes (Formal/Informal)
// ========================

// GET /api/pointer1/academic/:studentId - Get academic data
router.get('/academic/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getAcademicDataHandler);

// POST /api/pointer1/academic/section - Add a section
router.post('/academic/section', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), addSectionHandler);

// POST /api/pointer1/academic/subsection - Add a sub-section
router.post('/academic/subsection', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), addSubSectionHandler);

// PUT /api/pointer1/academic/subsection - Update a sub-section
router.put('/academic/subsection', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), updateSubSectionHandler);

// POST /api/pointer1/academic/subject - Add a subject
router.post('/academic/subject', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), addSubjectHandler);

// PUT /api/pointer1/academic/subject - Update a subject
router.put('/academic/subject', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), updateSubjectHandler);

// POST /api/pointer1/academic/project - Add a project
router.post('/academic/project', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), addProjectHandler);

// PUT /api/pointer1/academic/project - Update a project
router.put('/academic/project', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), updateProjectHandler);

// DELETE /api/pointer1/academic/section - Delete a section
router.delete('/academic/section', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), deleteSectionHandler);

// DELETE /api/pointer1/academic/subsection - Delete a sub-section
router.delete('/academic/subsection', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), deleteSubSectionHandler);

// DELETE /api/pointer1/academic/subject - Delete a subject
router.delete('/academic/subject', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), deleteSubjectHandler);

// DELETE /api/pointer1/academic/project - Delete a project
router.delete('/academic/project', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), deleteProjectHandler);

// PUT /api/pointer1/academic/weightages - Update weightages for informal sections
router.put('/academic/weightages', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), updateWeightagesHandler);

// GET /api/pointer1/academic/score/:studentId - Get academic excellence score
router.get('/academic/score/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getAcademicExcellenceScoreHandler);

export default router;
