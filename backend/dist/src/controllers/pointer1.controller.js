"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademicExcellenceScoreHandler = exports.updateWeightagesHandler = exports.deleteSubjectHandler = exports.deleteSubSectionHandler = exports.deleteSectionHandler = exports.updateSubjectHandler = exports.addSubjectHandler = exports.updateSubSectionHandler = exports.addSubSectionHandler = exports.addSectionHandler = exports.getAcademicDataHandler = exports.getAcademicStatusHandler = exports.evaluateAcademicHandler = exports.uploadAcademicDocumentHandler = exports.academicUploadMiddleware = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const multer_1 = __importDefault(require("multer"));
const pointer1_service_1 = require("../services/pointer1.service");
const AcademicDocumentType_1 = require("../types/AcademicDocumentType");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
exports.academicUploadMiddleware = upload.single('document');
const uploadAcademicDocumentHandler = async (req, res) => {
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
        if (!Object.values(AcademicDocumentType_1.AcademicDocumentType).includes(documentType)) {
            res.status(400).json({ success: false, message: 'Invalid document type' });
            return;
        }
        const doc = await (0, pointer1_service_1.uploadAcademicDocument)(studentIvyServiceId, studentId, documentType, file, customLabel);
        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: doc,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.uploadAcademicDocumentHandler = uploadAcademicDocumentHandler;
const evaluateAcademicHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, academicDocumentId, score, feedback } = req.body;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(req.user.userId);
        if (!studentIvyServiceId || !academicDocumentId || score === undefined) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const evaluation = await (0, pointer1_service_1.evaluateAcademicDocument)(studentIvyServiceId, academicDocumentId, ivyExpertId, Number(score), feedback);
        res.status(200).json({
            success: true,
            message: 'Evaluation saved successfully',
            data: evaluation,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.evaluateAcademicHandler = evaluateAcademicHandler;
const getAcademicStatusHandler = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;
        const identifier = studentIvyServiceId ? studentIvyServiceId : studentId;
        const useServiceId = !!studentIvyServiceId;
        if (!identifier) {
            res.status(400).json({ success: false, message: 'ID required' });
            return;
        }
        const data = await (0, pointer1_service_1.getAcademicStatus)(identifier, useServiceId);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getAcademicStatusHandler = getAcademicStatusHandler;
// ========================
// Academic Data Handlers
// ========================
const getAcademicDataHandler = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const studentIvyServiceId = req.query.studentIvyServiceId;
        if (!studentId || !studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentId and studentIvyServiceId required' });
            return;
        }
        const data = await (0, pointer1_service_1.getAcademicData)(studentId, studentIvyServiceId);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getAcademicDataHandler = getAcademicDataHandler;
const addSectionHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, examName, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !examName) {
            res.status(400).json({ success: false, message: 'All fields required' });
            return;
        }
        const data = await (0, pointer1_service_1.addSection)(studentId, studentIvyServiceId, examName, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.addSectionHandler = addSectionHandler;
const addSubSectionHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, testType, month, year, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.addSubSection)(studentId, studentIvyServiceId, sectionId, testType || (tab === 'informal' ? 'olympiad' : 'weekly'), month || 'January', year || new Date().getFullYear(), tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.addSubSectionHandler = addSubSectionHandler;
const updateSubSectionHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, tab, ...updates } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.updateSubSection)(studentId, studentIvyServiceId, sectionId, subSectionId, updates, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateSubSectionHandler = updateSubSectionHandler;
const addSubjectHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, name, marksObtained, totalMarks, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.addSubject)(studentId, studentIvyServiceId, sectionId, subSectionId, name || '', marksObtained || 0, totalMarks || 100, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.addSubjectHandler = addSubjectHandler;
const updateSubjectHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab, ...updates } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId || !subjectId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.updateSubject)(studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, updates, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateSubjectHandler = updateSubjectHandler;
const deleteSectionHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.deleteSection)(studentId, studentIvyServiceId, sectionId, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deleteSectionHandler = deleteSectionHandler;
const deleteSubSectionHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.deleteSubSection)(studentId, studentIvyServiceId, sectionId, subSectionId, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deleteSubSectionHandler = deleteSubSectionHandler;
const deleteSubjectHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab } = req.body;
        if (!studentId || !studentIvyServiceId || !sectionId || !subSectionId || !subjectId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.deleteSubject)(studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab || 'formal');
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deleteSubjectHandler = deleteSubjectHandler;
const updateWeightagesHandler = async (req, res) => {
    try {
        const { studentId, studentIvyServiceId, weightages } = req.body;
        if (!studentId || !studentIvyServiceId || !weightages) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const data = await (0, pointer1_service_1.updateWeightages)(studentId, studentIvyServiceId, weightages);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateWeightagesHandler = updateWeightagesHandler;
const getAcademicExcellenceScoreHandler = async (req, res) => {
    try {
        const studentId = String(req.params.studentId || '');
        const studentIvyServiceId = String(req.query.studentIvyServiceId || '');
        if (!studentId || !studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'Required fields missing' });
            return;
        }
        const scoreData = await (0, pointer1_service_1.getAcademicExcellenceScore)(studentId, studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: scoreData,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getAcademicExcellenceScoreHandler = getAcademicExcellenceScoreHandler;
//# sourceMappingURL=pointer1.controller.js.map