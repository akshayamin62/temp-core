"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademicExcellenceScore = exports.updateWeightages = exports.deleteSubject = exports.deleteSubSection = exports.deleteSection = exports.updateSubject = exports.addSubject = exports.updateSubSection = exports.addSubSection = exports.addSection = exports.getAcademicData = exports.getAcademicStatus = exports.evaluateAcademicDocument = exports.refreshPointer1MeanScore = exports.uploadAcademicDocument = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const AcademicDocument_1 = __importDefault(require("../models/ivy/AcademicDocument"));
const AcademicEvaluation_1 = __importDefault(require("../models/ivy/AcademicEvaluation"));
const AcademicData_1 = __importDefault(require("../models/ivy/AcademicData"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const Service_1 = __importDefault(require("../models/Service"));
const AcademicDocumentType_1 = require("../types/AcademicDocumentType");
const PointerNo_1 = require("../types/PointerNo");
const ivyScore_service_1 = require("./ivyScore.service");
const notification_service_1 = require("./notification.service");
const uploadDir_1 = require("../utils/uploadDir");
// File storage directory for Pointer 1
const UPLOAD_DIR_P1 = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'pointer1');
(0, uploadDir_1.ensureDir)(UPLOAD_DIR_P1);
const savePointer1File = async (file, subfolder) => {
    const folderPath = path_1.default.join(UPLOAD_DIR_P1, subfolder);
    (0, uploadDir_1.ensureDir)(folderPath);
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path_1.default.join(folderPath, fileName);
    fs_1.default.writeFileSync(filePath, file.buffer);
    return `/uploads/pointer1/${subfolder}/${fileName}`;
};
/** Student uploads academic document */
const uploadAcademicDocument = async (studentIvyServiceId, studentId, documentType, file, customLabel) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    if (service.studentId.toString() !== studentId) {
        throw new Error('Unauthorized: Student does not match this service');
    }
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF and Images (JPG/PNG) are allowed');
    }
    console.log(`[P1-Upload] Start: serviceId=${studentIvyServiceId}, docType=${documentType}, label=${customLabel}`);
    const fileUrl = await savePointer1File(file, documentType.toLowerCase());
    console.log(`[P1-Upload] File saved: ${fileUrl}`);
    // Logic: Overwrite if single-upload type, or if UNIVERSITY_MARKSHEET with same customLabel
    let existing = null;
    if (documentType === AcademicDocumentType_1.AcademicDocumentType.UNIVERSITY_MARKSHEET) {
        if (customLabel) {
            existing = await AcademicDocument_1.default.findOne({
                studentIvyServiceId,
                documentType,
                customLabel
            });
        }
    }
    else {
        existing = await AcademicDocument_1.default.findOne({
            studentIvyServiceId,
            documentType,
        });
    }
    if (existing) {
        console.log(`[P1-Upload] Overwriting existing document: ${existing._id}`);
        const oldFilePath = path_1.default.join(process.cwd(), existing.fileUrl);
        if (fs_1.default.existsSync(oldFilePath)) {
            try {
                fs_1.default.unlinkSync(oldFilePath);
            }
            catch (e) { }
        }
        // Reset evaluation for this specific document if it exists
        await AcademicEvaluation_1.default.deleteOne({ academicDocumentId: existing._id });
        existing.fileUrl = fileUrl;
        existing.fileName = file.originalname;
        existing.fileSize = file.size;
        existing.mimeType = file.mimetype;
        existing.customLabel = customLabel;
        existing.uploadedAt = new Date();
        await existing.save();
        // Refresh mean score (since one evaluation was removed)
        await (0, exports.refreshPointer1MeanScore)(studentIvyServiceId);
        return existing;
    }
    console.log(`[P1-Upload] Creating new document record...`);
    const academicDoc = await AcademicDocument_1.default.create({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        documentType,
        customLabel,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
    });
    console.log(`[P1-Upload] Success: ${academicDoc._id}`);
    // Create notification to alert ivyExpert about new document
    if (service.activeIvyExpertId) {
        await (0, notification_service_1.createNotification)({
            studentIvyServiceId,
            userId: service.activeIvyExpertId,
            userRole: 'ivyExpert',
            pointerNumber: 1,
            notificationType: 'document_uploaded',
            referenceId: academicDoc._id,
        });
    }
    return academicDoc;
};
exports.uploadAcademicDocument = uploadAcademicDocument;
/** Recalculates the mean score for Pointer 1 */
const refreshPointer1MeanScore = async (studentIvyServiceId) => {
    // 1. Get all marksheets for this service (document evaluation)
    const marksheets = await AcademicDocument_1.default.find({
        studentIvyServiceId,
        documentType: {
            $in: [
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_8,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_9,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_10,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_11,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_12,
                AcademicDocumentType_1.AcademicDocumentType.UNIVERSITY_MARKSHEET
            ]
        }
    });
    const docIds = marksheets.map(m => m._id);
    // 2. Get evaluations for these marksheets
    const evaluations = await AcademicEvaluation_1.default.find({
        academicDocumentId: { $in: docIds }
    });
    // Calculate document evaluation average
    let documentAvg = 0;
    if (evaluations.length > 0) {
        const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
        documentAvg = totalScore / evaluations.length;
    }
    // 3. Get informal sections with weightages and scores
    const academicData = await AcademicData_1.default.findOne({
        studentIvyServiceId
    });
    let weightedScoreSum = 0;
    if (academicData && academicData.informal && academicData.informal.sections) {
        academicData.informal.sections.forEach((section) => {
            const weightage = section.weightage || 0;
            // Calculate average score for this section's subsections
            if (section.subSections && section.subSections.length > 0) {
                const subSectionScores = section.subSections
                    .map((ss) => ss.score || 0)
                    .filter((score) => score > 0);
                if (subSectionScores.length > 0) {
                    const avgScore = subSectionScores.reduce((sum, score) => sum + score, 0) / subSectionScores.length;
                    weightedScoreSum += (weightage / 100) * avgScore;
                }
            }
        });
    }
    // 4. Apply the formula: ((documentAvg/2) + (weightedScoreSum/2))
    const finalScore = (documentAvg / 2) + (weightedScoreSum / 2);
    // 5. Update overall score
    await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, PointerNo_1.PointerNo.AcademicExcellence, finalScore);
    return finalScore;
};
exports.refreshPointer1MeanScore = refreshPointer1MeanScore;
/** Ivy Expert evaluates a specific academic document */
const evaluateAcademicDocument = async (studentIvyServiceId, academicDocumentId, ivyExpertId, score, feedback) => {
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(academicDocumentId)) {
        throw new Error('Invalid academicDocumentId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    const document = await AcademicDocument_1.default.findById(academicDocumentId);
    if (!document || document.studentIvyServiceId.toString() !== studentIvyServiceId) {
        throw new Error('Document not found or does not belong to this service');
    }
    // Check if this document type should be evaluated
    const evaluatableTypes = [
        AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_8,
        AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_9,
        AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_10,
        AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_11,
        AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_12,
        AcademicDocumentType_1.AcademicDocumentType.UNIVERSITY_MARKSHEET
    ];
    if (!evaluatableTypes.includes(document.documentType)) {
        throw new Error('This document type does not require evaluation');
    }
    let evaluation = await AcademicEvaluation_1.default.findOne({ academicDocumentId });
    if (evaluation) {
        evaluation.score = score;
        evaluation.feedback = feedback || '';
        evaluation.evaluatedBy = new mongoose_1.default.Types.ObjectId(ivyExpertId);
        evaluation.evaluatedAt = new Date();
        await evaluation.save();
    }
    else {
        evaluation = await AcademicEvaluation_1.default.create({
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
            academicDocumentId: new mongoose_1.default.Types.ObjectId(academicDocumentId),
            score,
            feedback: feedback || '',
            evaluatedBy: new mongoose_1.default.Types.ObjectId(ivyExpertId),
        });
    }
    // Refresh the overall Pointer 1 mean score
    await (0, exports.refreshPointer1MeanScore)(studentIvyServiceId);
    return evaluation;
};
exports.evaluateAcademicDocument = evaluateAcademicDocument;
/** Get Pointer 1 status/documents with evaluations */
const getAcademicStatus = async (studentIdOrServiceId, useServiceId = false) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIdOrServiceId)) {
        throw new Error('Invalid ID');
    }
    let service;
    if (useServiceId) {
        service = await StudentServiceRegistration_1.default.findById(studentIdOrServiceId);
    }
    else {
        // Filter by Ivy League service to avoid wrong registration for multi-service students
        const ivySvc = await Service_1.default.findOne({ slug: 'ivy-league' }).select('_id');
        const filter = { studentId: studentIdOrServiceId };
        if (ivySvc)
            filter.serviceId = ivySvc._id;
        service = await StudentServiceRegistration_1.default.findOne(filter);
    }
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    const documents = await AcademicDocument_1.default.find({ studentIvyServiceId: service._id }).lean();
    console.log(`[P1-Status] Found ${documents.length} docs for service ${service._id}`);
    const docIds = documents.map(d => d._id);
    const evaluations = await AcademicEvaluation_1.default.find({ academicDocumentId: { $in: docIds } }).lean();
    // Map evaluations to documents
    const evalMap = {};
    evaluations.forEach(ev => {
        evalMap[ev.academicDocumentId.toString()] = ev;
    });
    const docsWithEvals = documents.map(doc => ({
        ...doc,
        evaluation: evalMap[doc._id.toString()] || null
    }));
    // Current overall score for Pointer 1 from Service for reference (service.overallScore)
    return {
        studentIvyServiceId: service._id,
        documents: docsWithEvals,
    };
};
exports.getAcademicStatus = getAcademicStatus;
// ========================
// ACADEMIC DATA (Formal/Informal) Functions
// ========================
/** Get or create academic data for a student */
const getAcademicData = async (studentId, studentIvyServiceId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId) || !mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid IDs');
    }
    let data = await AcademicData_1.default.findOne({ studentId, studentIvyServiceId });
    if (!data) {
        data = await AcademicData_1.default.create({
            studentId,
            studentIvyServiceId,
            formal: { sections: [] },
            informal: { sections: [] }
        });
    }
    return data;
};
exports.getAcademicData = getAcademicData;
/** Helper function to redistribute weightages equally for informal sections */
const redistributeWeightages = (sections) => {
    if (sections.length === 0)
        return;
    const equalWeightage = Math.floor(100 / sections.length);
    const remainder = 100 - (equalWeightage * sections.length);
    sections.forEach((section, index) => {
        section.weightage = equalWeightage + (index === 0 ? remainder : 0);
    });
};
/** Add a new section to formal or informal */
const addSection = async (studentId, studentIvyServiceId, examName, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    data[tab].sections.push({
        examName,
        subSections: [],
        ...(tab === 'informal' ? { weightage: 0 } : {})
    });
    // Redistribute weightages for informal sections
    if (tab === 'informal') {
        redistributeWeightages(data.informal.sections);
    }
    await data.save();
    return data;
};
exports.addSection = addSection;
/** Add a sub-section to a section */
const addSubSection = async (studentId, studentIvyServiceId, sectionId, testType, month, year, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    // Automatically add one default subject when creating a sub-section
    section.subSections.push({
        testType,
        month,
        year,
        subjects: [{
                name: 'Subject 1',
                marksObtained: 0,
                totalMarks: 100,
                feedback: ''
            }],
        score: 0
    });
    await data.save();
    return data;
};
exports.addSubSection = addSubSection;
/** Update a sub-section */
const updateSubSection = async (studentId, studentIvyServiceId, sectionId, subSectionId, updates, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    const subSection = section.subSections.find((ss) => ss._id.toString() === subSectionId);
    if (!subSection) {
        throw new Error('Sub-section not found');
    }
    // Update allowed fields
    if (updates.testType)
        subSection.testType = updates.testType;
    if (updates.month)
        subSection.month = updates.month;
    if (updates.year)
        subSection.year = updates.year;
    if (updates.overallFeedback !== undefined)
        subSection.overallFeedback = updates.overallFeedback;
    if (updates.score !== undefined)
        subSection.score = updates.score;
    await data.save();
    // Refresh overall score if informal tab and score was updated
    if (tab === 'informal' && updates.score !== undefined) {
        await (0, exports.refreshPointer1MeanScore)(studentIvyServiceId);
    }
    return data;
};
exports.updateSubSection = updateSubSection;
/** Add a subject to a sub-section */
const addSubject = async (studentId, studentIvyServiceId, sectionId, subSectionId, name, marksObtained, totalMarks, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    const subSection = section.subSections.find((ss) => ss._id.toString() === subSectionId);
    if (!subSection) {
        throw new Error('Sub-section not found');
    }
    subSection.subjects.push({
        name,
        marksObtained,
        totalMarks,
        feedback: ''
    });
    await data.save();
    return data;
};
exports.addSubject = addSubject;
/** Update a subject */
const updateSubject = async (studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, updates, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    const subSection = section.subSections.find((ss) => ss._id.toString() === subSectionId);
    if (!subSection) {
        throw new Error('Sub-section not found');
    }
    const subject = subSection.subjects.find((sub) => sub._id.toString() === subjectId);
    if (!subject) {
        throw new Error('Subject not found');
    }
    // Update allowed fields
    if (updates.name !== undefined)
        subject.name = updates.name;
    if (updates.marksObtained !== undefined)
        subject.marksObtained = updates.marksObtained;
    if (updates.totalMarks !== undefined)
        subject.totalMarks = updates.totalMarks;
    if (updates.feedback !== undefined)
        subject.feedback = updates.feedback;
    await data.save();
    return data;
};
exports.updateSubject = updateSubject;
/** Delete a section */
const deleteSection = async (studentId, studentIvyServiceId, sectionId, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const sectionIndex = data[tab].sections.findIndex((s) => s._id.toString() === sectionId);
    if (sectionIndex === -1) {
        throw new Error('Section not found');
    }
    data[tab].sections.splice(sectionIndex, 1);
    // Redistribute weightages for informal sections
    if (tab === 'informal') {
        redistributeWeightages(data.informal.sections);
    }
    await data.save();
    return data;
};
exports.deleteSection = deleteSection;
/** Delete a sub-section */
const deleteSubSection = async (studentId, studentIvyServiceId, sectionId, subSectionId, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    const subSectionIndex = section.subSections.findIndex((ss) => ss._id.toString() === subSectionId);
    if (subSectionIndex === -1) {
        throw new Error('Sub-section not found');
    }
    section.subSections.splice(subSectionIndex, 1);
    await data.save();
    return data;
};
exports.deleteSubSection = deleteSubSection;
/** Delete a subject */
const deleteSubject = async (studentId, studentIvyServiceId, sectionId, subSectionId, subjectId, tab = 'formal') => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    const section = data[tab].sections.find((s) => s._id.toString() === sectionId);
    if (!section) {
        throw new Error('Section not found');
    }
    const subSection = section.subSections.find((ss) => ss._id.toString() === subSectionId);
    if (!subSection) {
        throw new Error('Sub-section not found');
    }
    const subjectIndex = subSection.subjects.findIndex((sub) => sub._id.toString() === subjectId);
    if (subjectIndex === -1) {
        throw new Error('Subject not found');
    }
    subSection.subjects.splice(subjectIndex, 1);
    await data.save();
    return data;
};
exports.deleteSubject = deleteSubject;
/** Update weightages for informal sections */
const updateWeightages = async (studentId, studentIvyServiceId, weightages) => {
    const data = await (0, exports.getAcademicData)(studentId, studentIvyServiceId);
    // Validate that weightages sum to 100
    const totalWeightage = weightages.reduce((sum, w) => sum + w.weightage, 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
        throw new Error(`Total weightage must equal 100, got ${totalWeightage}`);
    }
    // Validate each weightage is valid
    for (const w of weightages) {
        if (typeof w.weightage !== 'number' || w.weightage < 0 || w.weightage > 100) {
            throw new Error('Each weightage must be a number between 0 and 100');
        }
    }
    // Update weightages
    weightages.forEach(w => {
        const section = data.informal.sections.find((s) => s._id.toString() === w.sectionId);
        if (section) {
            section.weightage = w.weightage;
        }
    });
    await data.save();
    // Refresh overall score when weightages are updated
    await (0, exports.refreshPointer1MeanScore)(studentIvyServiceId);
    return data;
};
exports.updateWeightages = updateWeightages;
/** Get current academic excellence score */
const getAcademicExcellenceScore = async (_studentId, studentIvyServiceId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    // 1. Get document evaluation average
    const marksheets = await AcademicDocument_1.default.find({
        studentIvyServiceId,
        documentType: {
            $in: [
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_8,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_9,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_10,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_11,
                AcademicDocumentType_1.AcademicDocumentType.MARKSHEET_12,
                AcademicDocumentType_1.AcademicDocumentType.UNIVERSITY_MARKSHEET
            ]
        }
    });
    const docIds = marksheets.map(m => m._id);
    const evaluations = await AcademicEvaluation_1.default.find({
        academicDocumentId: { $in: docIds }
    });
    let documentAvg = 0;
    let evaluatedDocsCount = evaluations.length;
    if (evaluations.length > 0) {
        const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
        documentAvg = totalScore / evaluations.length;
    }
    // 2. Get informal sections weighted score
    const academicData = await AcademicData_1.default.findOne({
        studentIvyServiceId
    });
    let weightedScoreSum = 0;
    let informalSectionsWithScores = 0;
    if (academicData && academicData.informal && academicData.informal.sections) {
        academicData.informal.sections.forEach((section) => {
            const weightage = section.weightage || 0;
            if (section.subSections && section.subSections.length > 0) {
                const subSectionScores = section.subSections
                    .map((ss) => ss.score || 0)
                    .filter((score) => score > 0);
                if (subSectionScores.length > 0) {
                    const avgScore = subSectionScores.reduce((sum, score) => sum + score, 0) / subSectionScores.length;
                    weightedScoreSum += (weightage / 100) * avgScore;
                    informalSectionsWithScores++;
                }
            }
        });
    }
    // 3. Calculate final score
    const finalScore = (documentAvg / 2) + (weightedScoreSum / 2);
    return {
        finalScore,
        documentAvg,
        weightedScoreSum,
        evaluatedDocsCount,
        informalSectionsWithScores
    };
};
exports.getAcademicExcellenceScore = getAcademicExcellenceScore;
//# sourceMappingURL=pointer1.service.js.map