import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import AcademicDocument, { IAcademicDocument } from '../models/ivy/AcademicDocument';
import AcademicEvaluation, { IAcademicEvaluation } from '../models/ivy/AcademicEvaluation';
import AcademicData from '../models/ivy/AcademicData';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Service from '../models/Service';
import { AcademicDocumentType } from '../types/AcademicDocumentType';
import { PointerNo } from '../types/PointerNo';
import { updateScoreAfterEvaluation } from './ivyScore.service';
import { createNotification } from './notification.service';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// File storage directory for Pointer 1
const UPLOAD_DIR_P1 = path.join(getUploadBaseDir(), 'pointer1');
ensureDir(UPLOAD_DIR_P1);

const savePointer1File = async (file: Express.Multer.File, subfolder: string): Promise<string> => {
    const folderPath = path.join(UPLOAD_DIR_P1, subfolder);
    ensureDir(folderPath);

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return `/uploads/pointer1/${subfolder}/${fileName}`;
};

/** Student uploads academic document */
export const uploadAcademicDocument = async (
    studentIvyServiceId: string,
    studentId: string,
    documentType: AcademicDocumentType,
    file: Express.Multer.File,
    customLabel?: string
): Promise<IAcademicDocument> => {
    if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }

    const service = await StudentServiceRegistration.findById(studentIvyServiceId);
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
    if (documentType === AcademicDocumentType.UNIVERSITY_MARKSHEET) {
        if (customLabel) {
            existing = await AcademicDocument.findOne({
                studentIvyServiceId,
                documentType,
                customLabel
            });
        }
    } else {
        existing = await AcademicDocument.findOne({
            studentIvyServiceId,
            documentType,
        });
    }

    if (existing) {
        console.log(`[P1-Upload] Overwriting existing document: ${existing._id}`);
        const oldFilePath = path.join(process.cwd(), existing.fileUrl);
        if (fs.existsSync(oldFilePath)) {
            try { fs.unlinkSync(oldFilePath); } catch (e) { }
        }

        // Reset evaluation for this specific document if it exists
        await AcademicEvaluation.deleteOne({ academicDocumentId: existing._id });

        existing.fileUrl = fileUrl;
        existing.fileName = file.originalname;
        existing.fileSize = file.size;
        existing.mimeType = file.mimetype;
        existing.customLabel = customLabel;
        existing.uploadedAt = new Date();
        await existing.save();

        // Refresh mean score (since one evaluation was removed)
        await refreshPointer1MeanScore(studentIvyServiceId);

        return existing;
    }

    console.log(`[P1-Upload] Creating new document record...`);
    const academicDoc = await AcademicDocument.create({
        studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
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
        await createNotification({
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

/** Recalculates the mean score for Pointer 1 */
export const refreshPointer1MeanScore = async (studentIvyServiceId: string) => {
    // 1. Get all marksheets for this service (document evaluation)
    const marksheets = await AcademicDocument.find({
        studentIvyServiceId,
        documentType: {
            $in: [
                AcademicDocumentType.MARKSHEET_8,
                AcademicDocumentType.MARKSHEET_9,
                AcademicDocumentType.MARKSHEET_10,
                AcademicDocumentType.MARKSHEET_11,
                AcademicDocumentType.MARKSHEET_12,
                AcademicDocumentType.UNIVERSITY_MARKSHEET
            ]
        }
    });

    const docIds = marksheets.map(m => m._id);

    // 2. Get evaluations for these marksheets
    const evaluations = await AcademicEvaluation.find({
        academicDocumentId: { $in: docIds }
    });

    // Calculate document evaluation average
    let documentAvg = 0;
    if (evaluations.length > 0) {
        const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
        documentAvg = totalScore / evaluations.length;
    }

    // 3. Get informal sections with weightages and scores
    const academicData = await AcademicData.findOne({
        studentIvyServiceId
    });

    let weightedScoreSum = 0;
    if (academicData && academicData.informal && academicData.informal.sections) {
        academicData.informal.sections.forEach((section: any) => {
            const weightage = section.weightage || 0;
            
            // Calculate average score for this section's subsections
            if (section.subSections && section.subSections.length > 0) {
                const subSectionScores = section.subSections
                    .map((ss: any) => ss.score || 0)
                    .filter((score: number) => score > 0);
                
                if (subSectionScores.length > 0) {
                    const avgScore = subSectionScores.reduce((sum: number, score: number) => sum + score, 0) / subSectionScores.length;
                    weightedScoreSum += (weightage / 100) * avgScore;
                }
            }
        });
    }

    // 4. Apply the formula: ((documentAvg/2) + (weightedScoreSum/2))
    const finalScore = (documentAvg / 2) + (weightedScoreSum / 2);

    // 5. Update overall score
    await updateScoreAfterEvaluation(
        studentIvyServiceId,
        PointerNo.AcademicExcellence,
        finalScore
    );

    return finalScore;
};

/** Ivy Expert evaluates a specific academic document */
export const evaluateAcademicDocument = async (
    studentIvyServiceId: string,
    academicDocumentId: string,
    ivyExpertId: string,
    score: number,
    feedback?: string
): Promise<IAcademicEvaluation> => {
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose.Types.ObjectId.isValid(academicDocumentId)) {
        throw new Error('Invalid academicDocumentId');
    }
    if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }

    const service = await StudentServiceRegistration.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }

    const document = await AcademicDocument.findById(academicDocumentId);
    if (!document || document.studentIvyServiceId.toString() !== studentIvyServiceId) {
        throw new Error('Document not found or does not belong to this service');
    }

    // Check if this document type should be evaluated
    const evaluatableTypes = [
        AcademicDocumentType.MARKSHEET_8,
        AcademicDocumentType.MARKSHEET_9,
        AcademicDocumentType.MARKSHEET_10,
        AcademicDocumentType.MARKSHEET_11,
        AcademicDocumentType.MARKSHEET_12,
        AcademicDocumentType.UNIVERSITY_MARKSHEET
    ];
    if (!evaluatableTypes.includes(document.documentType)) {
        throw new Error('This document type does not require evaluation');
    }

    let evaluation = await AcademicEvaluation.findOne({ academicDocumentId });

    if (evaluation) {
        evaluation.score = score;
        evaluation.feedback = feedback || '';
        evaluation.evaluatedBy = new mongoose.Types.ObjectId(ivyExpertId);
        evaluation.evaluatedAt = new Date();
        await evaluation.save();
    } else {
        evaluation = await AcademicEvaluation.create({
            studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
            academicDocumentId: new mongoose.Types.ObjectId(academicDocumentId),
            score,
            feedback: feedback || '',
            evaluatedBy: new mongoose.Types.ObjectId(ivyExpertId),
        });
    }

    // Refresh the overall Pointer 1 mean score
    await refreshPointer1MeanScore(studentIvyServiceId);

    return evaluation;
};

/** Get Pointer 1 status/documents with evaluations */
export const getAcademicStatus = async (studentIdOrServiceId: string, useServiceId: boolean = false) => {
    if (!mongoose.Types.ObjectId.isValid(studentIdOrServiceId)) {
        throw new Error('Invalid ID');
    }

    let service;
    if (useServiceId) {
        service = await StudentServiceRegistration.findById(studentIdOrServiceId);
    } else {
        // Filter by Ivy League service to avoid wrong registration for multi-service students
        const ivySvc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
        const filter: any = { studentId: studentIdOrServiceId };
        if (ivySvc) filter.serviceId = ivySvc._id;
        service = await StudentServiceRegistration.findOne(filter);
    }

    if (!service) {
        throw new Error('Student Service Registration not found');
    }

    const documents = await AcademicDocument.find({ studentIvyServiceId: service._id }).lean();
    console.log(`[P1-Status] Found ${documents.length} docs for service ${service._id}`);
    const docIds = documents.map(d => d._id);
    const evaluations = await AcademicEvaluation.find({ academicDocumentId: { $in: docIds } }).lean();

    // Map evaluations to documents
    const evalMap: Record<string, any> = {};
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

// ========================
// ACADEMIC DATA (Formal/Informal) Functions
// ========================

/** Get or create academic data for a student */
export const getAcademicData = async (
    studentId: string,
    studentIvyServiceId: string
) => {
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid IDs');
    }

    let data = await AcademicData.findOne({ studentId, studentIvyServiceId });
    
    if (!data) {
        data = await AcademicData.create({
            studentId,
            studentIvyServiceId,
            formal: { sections: [] },
            informal: { sections: [] }
        });
    }

    return data;
};

/** Helper function to redistribute weightages equally for informal sections */
const redistributeWeightages = (sections: any[]) => {
    if (sections.length === 0) return;
    
    const equalWeightage = Math.floor(100 / sections.length);
    const remainder = 100 - (equalWeightage * sections.length);
    
    sections.forEach((section, index) => {
        section.weightage = equalWeightage + (index === 0 ? remainder : 0);
    });
};

/** Add a new section to formal or informal */
export const addSection = async (
    studentId: string,
    studentIvyServiceId: string,
    examName: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    data[tab].sections.push({
        examName,
        subSections: [],
        ...(tab === 'informal' ? { weightage: 0 } : {})
    } as any);
    
    // Redistribute weightages for informal sections
    if (tab === 'informal') {
        redistributeWeightages(data.informal.sections);
    }
    
    await data.save();
    return data;
};

/** Add a sub-section to a section */
export const addSubSection = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    testType: string,
    month: string,
    year: number,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const isProject = testType === 'project';

    // Automatically add one default subject or project when creating a sub-section
    section.subSections.push({
        testType,
        month,
        year,
        subjects: isProject ? [] : [{
            name: 'Subject 1',
            marksObtained: 0,
            totalMarks: 100,
            feedback: ''
        }],
        projects: isProject ? [{
            title: 'Project 1',
            description: '',
            organizationName: '',
            projectUrl: '',
            feedback: ''
        }] : [],
        score: 0
    } as any);
    
    await data.save();
    return data;
};

/** Update a sub-section */
export const updateSubSection = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    updates: any,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );
    
    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    // Update allowed fields
    if (updates.testType) {
        subSection.testType = updates.testType;
        if (updates.testType === 'project' && (!(subSection as any).projects || (subSection as any).projects.length === 0)) {
            (subSection as any).projects = [{
                title: 'Project 1',
                description: '',
                organizationName: '',
                projectUrl: '',
                feedback: ''
            }];
        }
        if (updates.testType !== 'project' && (!subSection.subjects || subSection.subjects.length === 0)) {
            subSection.subjects = [{
                name: 'Subject 1',
                marksObtained: 0,
                totalMarks: 100,
                feedback: ''
            }] as any;
        }
    }
    if (updates.month) subSection.month = updates.month;
    if (updates.year) subSection.year = updates.year;
    if (updates.overallFeedback !== undefined) subSection.overallFeedback = updates.overallFeedback;
    if (updates.score !== undefined) subSection.score = updates.score;
    
    await data.save();
    
    // Refresh overall score if informal tab and score was updated
    if (tab === 'informal' && updates.score !== undefined) {
        await refreshPointer1MeanScore(studentIvyServiceId);
    }
    
    return data;
};

/** Add a project to a sub-section */
export const addProject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    title: string,
    description: string,
    organizationName: string,
    projectUrl: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);

    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );

    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );

    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    if (!(subSection as any).projects) (subSection as any).projects = [];

    (subSection as any).projects.push({
        title,
        description,
        organizationName,
        projectUrl,
        feedback: ''
    });

    await data.save();
    return data;
};

/** Add a subject to a sub-section */
export const addSubject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    name: string,
    marksObtained: number,
    totalMarks: number,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );
    
    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    subSection.subjects.push({
        name,
        marksObtained,
        totalMarks,
        feedback: ''
    } as any);
    
    await data.save();
    return data;
};

/** Update a subject */
export const updateSubject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    subjectId: string,
    updates: any,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );
    
    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    const subject = subSection.subjects.find(
        (sub: any) => sub._id.toString() === subjectId
    );
    
    if (!subject) {
        throw new Error('Subject not found');
    }

    // Update allowed fields
    if (updates.name !== undefined) subject.name = updates.name;
    if (updates.marksObtained !== undefined) subject.marksObtained = updates.marksObtained;
    if (updates.totalMarks !== undefined) subject.totalMarks = updates.totalMarks;
    if (updates.feedback !== undefined) subject.feedback = updates.feedback;
    
    await data.save();
    return data;
};

/** Update a project */
export const updateProject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    projectId: string,
    updates: any,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);

    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );

    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );

    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    const project = (subSection as any).projects?.find(
        (proj: any) => proj._id.toString() === projectId
    );

    if (!project) {
        throw new Error('Project not found');
    }

    if (updates.title !== undefined) project.title = updates.title;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.organizationName !== undefined) project.organizationName = updates.organizationName;
    if (updates.projectUrl !== undefined) project.projectUrl = updates.projectUrl;
    if (updates.feedback !== undefined) project.feedback = updates.feedback;

    await data.save();
    return data;
};

/** Delete a section */
export const deleteSection = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const sectionIndex = data[tab].sections.findIndex(
        (s: any) => s._id.toString() === sectionId
    );
    
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

/** Delete a sub-section */
export const deleteSubSection = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const subSectionIndex = section.subSections.findIndex(
        (ss: any) => ss._id.toString() === subSectionId
    );
    
    if (subSectionIndex === -1) {
        throw new Error('Sub-section not found');
    }

    section.subSections.splice(subSectionIndex, 1);
    await data.save();
    return data;
};

/** Delete a subject */
export const deleteSubject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    subjectId: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );
    
    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );
    
    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    const subjectIndex = subSection.subjects.findIndex(
        (sub: any) => sub._id.toString() === subjectId
    );
    
    if (subjectIndex === -1) {
        throw new Error('Subject not found');
    }

    subSection.subjects.splice(subjectIndex, 1);
    await data.save();
    return data;
};

/** Delete a project */
export const deleteProject = async (
    studentId: string,
    studentIvyServiceId: string,
    sectionId: string,
    subSectionId: string,
    projectId: string,
    tab: 'formal' | 'informal' = 'formal'
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);

    const section = data[tab].sections.find(
        (s: any) => s._id.toString() === sectionId
    );

    if (!section) {
        throw new Error('Section not found');
    }

    const subSection = section.subSections.find(
        (ss: any) => ss._id.toString() === subSectionId
    );

    if (!subSection) {
        throw new Error('Sub-section not found');
    }

    const projectIndex = (subSection as any).projects?.findIndex(
        (proj: any) => proj._id.toString() === projectId
    );

    if (projectIndex === undefined || projectIndex === -1) {
        throw new Error('Project not found');
    }

    (subSection as any).projects.splice(projectIndex, 1);
    await data.save();
    return data;
};

/** Update weightages for informal sections */
export const updateWeightages = async (
    studentId: string,
    studentIvyServiceId: string,
    weightages: { sectionId: string; weightage: number }[]
) => {
    const data = await getAcademicData(studentId, studentIvyServiceId);
    
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
        const section = data.informal.sections.find(
            (s: any) => s._id.toString() === w.sectionId
        );
        if (section) {
            section.weightage = w.weightage;
        }
    });
    
    await data.save();
    
    // Refresh overall score when weightages are updated
    await refreshPointer1MeanScore(studentIvyServiceId);
    
    return data;
};

/** Get current academic excellence score */
export const getAcademicExcellenceScore = async (
    _studentId: string,
    studentIvyServiceId: string
) => {
    if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }

    // 1. Get document evaluation average
    const marksheets = await AcademicDocument.find({
        studentIvyServiceId,
        documentType: {
            $in: [
                AcademicDocumentType.MARKSHEET_8,
                AcademicDocumentType.MARKSHEET_9,
                AcademicDocumentType.MARKSHEET_10,
                AcademicDocumentType.MARKSHEET_11,
                AcademicDocumentType.MARKSHEET_12,
                AcademicDocumentType.UNIVERSITY_MARKSHEET
            ]
        }
    });

    const docIds = marksheets.map(m => m._id);
    const evaluations = await AcademicEvaluation.find({
        academicDocumentId: { $in: docIds }
    });

    let documentAvg = 0;
    let evaluatedDocsCount = evaluations.length;
    if (evaluations.length > 0) {
        const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
        documentAvg = totalScore / evaluations.length;
    }

    // 2. Get informal sections weighted score
    const academicData = await AcademicData.findOne({
        studentIvyServiceId
    });

    let weightedScoreSum = 0;
    let informalSectionsWithScores = 0;
    
    if (academicData && academicData.informal && academicData.informal.sections) {
        academicData.informal.sections.forEach((section: any) => {
            const weightage = section.weightage || 0;
            
            if (section.subSections && section.subSections.length > 0) {
                const subSectionScores = section.subSections
                    .map((ss: any) => ss.score || 0)
                    .filter((score: number) => score > 0);
                
                if (subSectionScores.length > 0) {
                    const avgScore = subSectionScores.reduce((sum: number, score: number) => sum + score, 0) / subSectionScores.length;
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
