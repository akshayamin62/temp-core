"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointer6Score = exports.updatePointer6Score = exports.scoreCourseCertificate = exports.uploadCourseCertificate = exports.unselectCourse = exports.selectCourse = exports.getPointer6Status = exports.evaluatePointer6 = exports.evaluateCertificate = exports.deleteCertificate = exports.replaceCertificate = exports.uploadCertificates = exports.uploadCourseList = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const XLSX = __importStar(require("xlsx"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const Student_1 = __importDefault(require("../models/Student"));
const IvyExpert_1 = __importDefault(require("../models/IvyExpert"));
const Service_1 = __importDefault(require("../models/Service"));
const PointerNo_1 = require("../types/PointerNo");
const Pointer6CourseList_1 = __importDefault(require("../models/ivy/Pointer6CourseList"));
const Pointer6Course_1 = __importDefault(require("../models/ivy/Pointer6Course"));
const Pointer6SelectedCourse_1 = __importDefault(require("../models/ivy/Pointer6SelectedCourse"));
const Pointer6Certificate_1 = __importDefault(require("../models/ivy/Pointer6Certificate"));
const Pointer6Evaluation_1 = __importDefault(require("../models/ivy/Pointer6Evaluation"));
const Pointer6CertificateEvaluation_1 = __importDefault(require("../models/ivy/Pointer6CertificateEvaluation"));
const ivyScore_service_1 = require("./ivyScore.service");
const notification_service_1 = require("./notification.service");
const uploadDir_1 = require("../utils/uploadDir");
// File storage directory for Pointer 6
const UPLOAD_DIR_P6 = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'pointer6');
(0, uploadDir_1.ensureDir)(UPLOAD_DIR_P6);
const savePointer6File = async (file, subfolder) => {
    const folderPath = path_1.default.join(UPLOAD_DIR_P6, subfolder);
    (0, uploadDir_1.ensureDir)(folderPath);
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path_1.default.join(folderPath, fileName);
    fs_1.default.writeFileSync(filePath, file.buffer);
    return `/uploads/pointer6/${subfolder}/${fileName}`;
};
/** Ivy Expert uploads course list (Excel) */
const uploadCourseList = async (studentIvyServiceId, ivyExpertId, file) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: User is not an Ivy Expert');
    }
    // Validate Excel mimetype
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed');
    }
    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    if (data.length === 0) {
        throw new Error('Excel file is empty');
    }
    // Delete existing courses for this student
    await Pointer6Course_1.default.deleteMany({
        studentIvyServiceId,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    // Save courses to database
    const courses = data.map((row, index) => {
        // Normalize keys by trimming spaces
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
            normalizedRow[key.trim()] = row[key];
        });
        // Helper function to get field value with multiple possible keys
        const getField = (keys) => {
            for (const key of keys) {
                if (normalizedRow[key] !== undefined && normalizedRow[key] !== null && normalizedRow[key] !== '') {
                    return String(normalizedRow[key]).trim();
                }
            }
            return '';
        };
        const courseName = getField(['course name', 'courseName', 'Course name', 'Course Name', 'CourseName']);
        const duration = getField(['Duration', 'duration']);
        const link = getField(['link', 'Link', 'URL', 'url']);
        const platform = getField(['Platform', 'platform']);
        // Validate required fields
        if (!courseName || !duration || !link) {
            console.error(`Row ${index + 1} validation failed:`, {
                courseName: courseName || 'MISSING',
                duration: duration || 'MISSING',
                link: link || 'MISSING',
                availableKeys: Object.keys(normalizedRow)
            });
            throw new Error(`Row ${index + 1}: Missing required fields. courseName: "${courseName}", duration: "${duration}", link: "${link}"`);
        }
        return {
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
            pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
            srNo: parseInt(getField(['Sr. no.', 'Sr.no.', 'Sr no', 'srNo', 'Sr. No.', 'Sr No.']) || '0'),
            platform: platform || 'N/A',
            courseName,
            duration,
            fees: getField(['Fees Rs.', 'Fees', 'fees', 'Fee']) || 'N/A',
            link,
            uploadedBy: new mongoose_1.default.Types.ObjectId(ivyExpertId),
        };
    });
    await Pointer6Course_1.default.insertMany(courses);
    const fileUrl = await savePointer6File(file, 'courses');
    // Overwrite existing course list if any
    const existing = await Pointer6CourseList_1.default.findOne({
        studentIvyServiceId,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    if (existing) {
        const oldFilePath = path_1.default.join(process.cwd(), existing.fileUrl);
        if (fs_1.default.existsSync(oldFilePath)) {
            fs_1.default.unlinkSync(oldFilePath);
        }
        existing.fileUrl = fileUrl;
        existing.fileName = file.originalname;
        existing.fileSize = file.size;
        existing.mimeType = file.mimetype;
        existing.uploadedBy = new mongoose_1.default.Types.ObjectId(ivyExpertId);
        existing.uploadedAt = new Date();
        await existing.save();
        return existing;
    }
    const courseList = await Pointer6CourseList_1.default.create({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new mongoose_1.default.Types.ObjectId(ivyExpertId),
    });
    // Create notification to alert student about new course list
    await (0, notification_service_1.createNotification)({
        studentIvyServiceId,
        userId: service.studentId,
        userRole: 'student',
        pointerNumber: 6,
        notificationType: 'course_list_uploaded',
        referenceId: courseList._id,
    });
    return courseList;
};
exports.uploadCourseList = uploadCourseList;
/** Student uploads one or more completion certificates */
const uploadCertificates = async (studentIvyServiceId, studentId, files) => {
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
    const studentRecord = await Student_1.default.findById(studentId);
    if (!studentRecord) {
        throw new Error('Unauthorized: Student not found');
    }
    if (!files || files.length === 0) {
        throw new Error('No certificate files provided');
    }
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];
    const created = [];
    for (const file of files) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            // Skip unsupported file types
            continue;
        }
        const fileUrl = await savePointer6File(file, 'certificates');
        const certificate = await Pointer6Certificate_1.default.create({
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
            pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
            fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: new mongoose_1.default.Types.ObjectId(studentId),
        });
        created.push(certificate);
    }
    if (created.length === 0) {
        throw new Error('No valid certificate files were uploaded');
    }
    // Recalculate average score after new certificates are added
    await recalculatePointer6Score(studentIvyServiceId);
    return created;
};
exports.uploadCertificates = uploadCertificates;
/** Student replaces/re-uploads a specific certificate */
const replaceCertificate = async (certificateId, studentId, file) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(certificateId)) {
        throw new Error('Invalid certificateId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }
    const certificate = await Pointer6Certificate_1.default.findById(certificateId);
    if (!certificate) {
        throw new Error('Certificate not found');
    }
    // Verify student owns this certificate
    if (certificate.uploadedBy.toString() !== studentId) {
        throw new Error('Unauthorized: You do not own this certificate');
    }
    const studentRecord = await Student_1.default.findById(studentId);
    if (!studentRecord) {
        throw new Error('Unauthorized: Student not found');
    }
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF and images are allowed');
    }
    // Delete old file
    const oldFilePath = path_1.default.join(process.cwd(), certificate.fileUrl);
    if (fs_1.default.existsSync(oldFilePath)) {
        fs_1.default.unlinkSync(oldFilePath);
    }
    // Delete existing evaluation for this certificate (require re-evaluation)
    await Pointer6CertificateEvaluation_1.default.deleteOne({ certificateId: certificate._id });
    // Save new file
    const fileUrl = await savePointer6File(file, 'certificates');
    // Update certificate
    certificate.fileUrl = fileUrl;
    certificate.fileName = file.originalname;
    certificate.fileSize = file.size;
    certificate.mimeType = file.mimetype;
    certificate.uploadedAt = new Date();
    await certificate.save();
    // Recalculate average score
    await recalculatePointer6Score(certificate.studentIvyServiceId.toString());
    return certificate;
};
exports.replaceCertificate = replaceCertificate;
/** Delete a specific certificate (Student) */
const deleteCertificate = async (certificateId, studentId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(certificateId)) {
        throw new Error('Invalid certificateId');
    }
    const certificate = await Pointer6Certificate_1.default.findById(certificateId);
    if (!certificate) {
        throw new Error('Certificate not found');
    }
    // Verify student owns this certificate
    if (certificate.uploadedBy.toString() !== studentId) {
        throw new Error('Unauthorized: You do not own this certificate');
    }
    // Delete file
    const filePath = path_1.default.join(process.cwd(), certificate.fileUrl);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
    // Delete evaluation if exists
    await Pointer6CertificateEvaluation_1.default.deleteOne({ certificateId: certificate._id });
    // Delete certificate
    await Pointer6Certificate_1.default.deleteOne({ _id: certificate._id });
    // Recalculate average score
    await recalculatePointer6Score(certificate.studentIvyServiceId.toString());
};
exports.deleteCertificate = deleteCertificate;
/** Ivy Expert evaluates a specific certificate */
const evaluateCertificate = async (certificateId, ivyExpertId, score, feedback) => {
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(certificateId)) {
        throw new Error('Invalid certificateId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    const certificate = await Pointer6Certificate_1.default.findById(certificateId);
    if (!certificate) {
        throw new Error('Certificate not found');
    }
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: User is not an Ivy Expert');
    }
    let evaluation = await Pointer6CertificateEvaluation_1.default.findOne({ certificateId });
    if (evaluation) {
        evaluation.score = score;
        evaluation.feedback = feedback || '';
        evaluation.evaluatedBy = new mongoose_1.default.Types.ObjectId(ivyExpertId);
        evaluation.evaluatedAt = new Date();
        await evaluation.save();
    }
    else {
        evaluation = await Pointer6CertificateEvaluation_1.default.create({
            studentIvyServiceId: certificate.studentIvyServiceId,
            certificateId: new mongoose_1.default.Types.ObjectId(certificateId),
            score,
            feedback: feedback || '',
            evaluatedBy: new mongoose_1.default.Types.ObjectId(ivyExpertId),
        });
    }
    // Recalculate average score after evaluation
    await recalculatePointer6Score(certificate.studentIvyServiceId.toString());
    return evaluation;
};
exports.evaluateCertificate = evaluateCertificate;
/** Recalculate Pointer 6 average score based on individual certificate evaluations */
const recalculatePointer6Score = async (studentIvyServiceId) => {
    const certificates = await Pointer6Certificate_1.default.find({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    if (certificates.length === 0) {
        // No certificates, set score to 0
        await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, PointerNo_1.PointerNo.IntellectualCuriosity, 0);
        return;
    }
    const certificateIds = certificates.map(c => c._id);
    const evaluations = await Pointer6CertificateEvaluation_1.default.find({
        certificateId: { $in: certificateIds },
    });
    if (evaluations.length === 0) {
        // No evaluations yet, set score to 0
        await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, PointerNo_1.PointerNo.IntellectualCuriosity, 0);
        return;
    }
    // Calculate average score
    const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
    const averageScore = totalScore / evaluations.length;
    // Update Pointer6Evaluation (for backward compatibility)
    let pointer6Eval = await Pointer6Evaluation_1.default.findOne({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    if (pointer6Eval) {
        pointer6Eval.score = averageScore;
        pointer6Eval.feedback = `Average of ${evaluations.length} certificate evaluations`;
        pointer6Eval.evaluatedAt = new Date();
        await pointer6Eval.save();
    }
    else {
        await Pointer6Evaluation_1.default.create({
            studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
            pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
            score: averageScore,
            feedback: `Average of ${evaluations.length} certificate evaluations`,
            evaluatedBy: evaluations[0].evaluatedBy,
        });
    }
    // Update overall Ivy score
    await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, PointerNo_1.PointerNo.IntellectualCuriosity, averageScore);
};
/** Ivy Expert assigns Pointer 6 score (DEPRECATED - use individual certificate evaluation) */
const evaluatePointer6 = async (studentIvyServiceId, ivyExpertId, score, feedback) => {
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: User is not an Ivy Expert');
    }
    let evaluation = await Pointer6Evaluation_1.default.findOne({
        studentIvyServiceId,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    if (evaluation) {
        evaluation.score = score;
        evaluation.feedback = feedback || '';
        evaluation.evaluatedBy = new mongoose_1.default.Types.ObjectId(ivyExpertId);
        evaluation.evaluatedAt = new Date();
        await evaluation.save();
        return evaluation;
    }
    evaluation = await Pointer6Evaluation_1.default.create({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
        score,
        feedback: feedback || '',
        evaluatedBy: new mongoose_1.default.Types.ObjectId(ivyExpertId),
    });
    // Update overall Ivy score
    await (0, ivyScore_service_1.updateScoreAfterEvaluation)(service._id.toString(), PointerNo_1.PointerNo.IntellectualCuriosity, score);
    return evaluation;
};
exports.evaluatePointer6 = evaluatePointer6;
/** Get Pointer 6 status for a student (by studentId or serviceId) */
const getPointer6Status = async (studentIdOrServiceId, useServiceId = false) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIdOrServiceId)) {
        throw new Error('Invalid studentId or studentIvyServiceId');
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
    const courseList = await Pointer6CourseList_1.default.findOne({
        studentIvyServiceId: service._id,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    // Get courses from database
    const courses = await Pointer6Course_1.default.find({
        studentIvyServiceId: service._id,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    }).sort({ srNo: 1 });
    // Get selected courses with dates
    const selectedCourses = await Pointer6SelectedCourse_1.default.find({
        studentIvyServiceId: service._id,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    // Create map of selected courses with all details
    const selectedMap = new Map();
    selectedCourses.forEach(sc => {
        selectedMap.set(sc.courseId.toString(), {
            startDate: sc.startDate,
            endDate: sc.endDate,
            selectedBy: sc.selectedBy,
            selectedAt: sc.selectedAt,
            certificateFileName: sc.certificateFileName,
            certificateFileUrl: sc.certificateFileUrl,
            certificateUploadedAt: sc.certificateUploadedAt,
            score: sc.score,
            scoredBy: sc.scoredBy,
            scoredAt: sc.scoredAt,
        });
    });
    const certificates = await Pointer6Certificate_1.default.find({
        studentIvyServiceId: service._id,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    }).sort({ uploadedAt: -1 });
    // Get evaluations for each certificate
    const certificateIds = certificates.map(c => c._id);
    const certificateEvaluations = await Pointer6CertificateEvaluation_1.default.find({
        certificateId: { $in: certificateIds },
    });
    const evaluationMap = new Map();
    certificateEvaluations.forEach(ev => {
        evaluationMap.set(ev.certificateId.toString(), ev);
    });
    const evaluation = await Pointer6Evaluation_1.default.findOne({
        studentIvyServiceId: service._id,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
    });
    return {
        studentIvyServiceId: service._id,
        courseList: courseList
            ? {
                _id: courseList._id,
                fileName: courseList.fileName,
                fileUrl: courseList.fileUrl,
                uploadedAt: courseList.uploadedAt,
            }
            : null,
        courses: courses.map((c) => ({
            _id: c._id,
            srNo: c.srNo,
            platform: c.platform,
            courseName: c.courseName,
            duration: c.duration,
            fees: c.fees,
            link: c.link,
            selected: selectedMap.has(c._id.toString()),
            startDate: selectedMap.get(c._id.toString())?.startDate || null,
            endDate: selectedMap.get(c._id.toString())?.endDate || null,
            certificateFileName: selectedMap.get(c._id.toString())?.certificateFileName || null,
            certificateFileUrl: selectedMap.get(c._id.toString())?.certificateFileUrl || null,
            certificateUploadedAt: selectedMap.get(c._id.toString())?.certificateUploadedAt || null,
            score: selectedMap.get(c._id.toString())?.score || null,
            scoredBy: selectedMap.get(c._id.toString())?.scoredBy || null,
            scoredAt: selectedMap.get(c._id.toString())?.scoredAt || null,
        })),
        certificates: certificates.map((c) => {
            const certEval = evaluationMap.get(c._id.toString());
            return {
                _id: c._id,
                fileName: c.fileName,
                fileUrl: c.fileUrl,
                uploadedAt: c.uploadedAt,
                evaluation: certEval ? {
                    score: certEval.score,
                    feedback: certEval.feedback,
                    evaluatedAt: certEval.evaluatedAt,
                } : null,
            };
        }),
        evaluation: evaluation
            ? {
                score: evaluation.score,
                feedback: evaluation.feedback,
                evaluatedAt: evaluation.evaluatedAt,
            }
            : null,
    };
};
exports.getPointer6Status = getPointer6Status;
/** Select a course with start and end dates */
const selectCourse = async (studentIvyServiceId, courseId, startDate, endDate, userId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(courseId)) {
        throw new Error('Invalid courseId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid userId');
    }
    // Resolve Student._id to User._id for the selectedBy field
    const studentRecord = await Student_1.default.findById(userId);
    const resolvedUserId = studentRecord ? studentRecord.userId : new mongoose_1.default.Types.ObjectId(userId);
    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
        throw new Error('Start date must be before end date');
    }
    // Check if course exists
    const course = await Pointer6Course_1.default.findById(courseId);
    if (!course) {
        throw new Error('Course not found');
    }
    // Check if already selected
    const existing = await Pointer6SelectedCourse_1.default.findOne({
        studentIvyServiceId,
        courseId,
    });
    if (existing) {
        // Update existing selection
        existing.startDate = startDate;
        existing.endDate = endDate;
        existing.selectedBy = new mongoose_1.default.Types.ObjectId(resolvedUserId);
        existing.selectedAt = new Date();
        await existing.save();
        return existing;
    }
    // Create new selection
    const selection = await Pointer6SelectedCourse_1.default.create({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
        courseId: new mongoose_1.default.Types.ObjectId(courseId),
        startDate,
        endDate,
        selectedBy: new mongoose_1.default.Types.ObjectId(resolvedUserId),
    });
    return selection;
};
exports.selectCourse = selectCourse;
/** Unselect a course */
const unselectCourse = async (studentIvyServiceId, courseId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(courseId)) {
        throw new Error('Invalid courseId');
    }
    const result = await Pointer6SelectedCourse_1.default.deleteOne({
        studentIvyServiceId,
        courseId,
    });
    if (result.deletedCount === 0) {
        throw new Error('Course selection not found');
    }
    return { success: true };
};
exports.unselectCourse = unselectCourse;
/** Upload certificate for a selected course (Student) */
const uploadCourseCertificate = async (studentIvyServiceId, courseId, studentId, file) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(courseId)) {
        throw new Error('Invalid courseId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }
    // Validate file type
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF and images are allowed');
    }
    // Find the selected course
    const selectedCourse = await Pointer6SelectedCourse_1.default.findOne({
        studentIvyServiceId,
        courseId,
    });
    if (!selectedCourse) {
        throw new Error('Selected course not found');
    }
    // Delete old certificate file if exists
    if (selectedCourse.certificateFileUrl) {
        const oldFilePath = path_1.default.join(process.cwd(), selectedCourse.certificateFileUrl);
        if (fs_1.default.existsSync(oldFilePath)) {
            fs_1.default.unlinkSync(oldFilePath);
        }
    }
    // Save new certificate
    const fileUrl = await savePointer6File(file, 'course-certificates');
    // Update selected course with certificate
    selectedCourse.certificateFileName = file.originalname;
    selectedCourse.certificateFileUrl = fileUrl;
    selectedCourse.certificateUploadedAt = new Date();
    // Reset score when new certificate is uploaded
    selectedCourse.score = undefined;
    selectedCourse.scoredBy = undefined;
    selectedCourse.scoredAt = undefined;
    await selectedCourse.save();
    // Create notification to alert Ivy Expert about new certificate
    const notificationService = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (notificationService && notificationService.activeIvyExpertId) {
        await (0, notification_service_1.createNotification)({
            studentIvyServiceId,
            userId: notificationService.activeIvyExpertId,
            userRole: 'ivyExpert',
            pointerNumber: 6,
            notificationType: 'certificate_uploaded',
            referenceId: selectedCourse._id,
        });
    }
    return selectedCourse;
};
exports.uploadCourseCertificate = uploadCourseCertificate;
/** Score a course certificate (Ivy Expert) */
const scoreCourseCertificate = async (studentIvyServiceId, courseId, ivyExpertId, score) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(courseId)) {
        throw new Error('Invalid courseId');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    // Find the selected course
    const selectedCourse = await Pointer6SelectedCourse_1.default.findOne({
        studentIvyServiceId,
        courseId,
    });
    if (!selectedCourse) {
        throw new Error('Selected course not found');
    }
    if (!selectedCourse.certificateFileUrl) {
        throw new Error('No certificate uploaded for this course');
    }
    // Update score
    selectedCourse.score = score;
    selectedCourse.scoredBy = new mongoose_1.default.Types.ObjectId(ivyExpertId);
    selectedCourse.scoredAt = new Date();
    await selectedCourse.save();
    // Update the overall Pointer 6 score
    await (0, exports.updatePointer6Score)(studentIvyServiceId);
    return selectedCourse;
};
exports.scoreCourseCertificate = scoreCourseCertificate;
/** Calculate and update Pointer 6 score based on all scored certificates */
const updatePointer6Score = async (studentIvyServiceId) => {
    const selectedCourses = await Pointer6SelectedCourse_1.default.find({
        studentIvyServiceId,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
        score: { $exists: true, $ne: null },
    });
    if (selectedCourses.length === 0) {
        return null;
    }
    // Calculate average score
    const totalScore = selectedCourses.reduce((sum, course) => sum + (course.score || 0), 0);
    const averageScore = totalScore / selectedCourses.length;
    // Update score in ivyScore service
    await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, PointerNo_1.PointerNo.IntellectualCuriosity, averageScore);
    return averageScore;
};
exports.updatePointer6Score = updatePointer6Score;
/** Get Pointer 6 score */
const getPointer6Score = async (studentIvyServiceId) => {
    const selectedCourses = await Pointer6SelectedCourse_1.default.find({
        studentIvyServiceId,
        pointerNo: PointerNo_1.PointerNo.IntellectualCuriosity,
        score: { $exists: true, $ne: null },
    });
    if (selectedCourses.length === 0) {
        return 0;
    }
    const totalScore = selectedCourses.reduce((sum, course) => sum + (course.score || 0), 0);
    return totalScore / selectedCourses.length;
};
exports.getPointer6Score = getPointer6Score;
//# sourceMappingURL=pointer6.service.js.map