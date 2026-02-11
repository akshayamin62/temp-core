"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointer6CourseScoreHandler = exports.scoreCourseCertificateHandler = exports.uploadCourseCertificateHandler = exports.uploadCourseCertificateMiddleware = exports.unselectCourseHandler = exports.selectCourseHandler = exports.getPointer6ScoreHandler = exports.evaluateCertificateHandler = exports.deleteCertificateHandler = exports.replaceCertificateHandler = exports.replaceCertificateMiddleware = exports.getPointer6StatusHandler = exports.evaluatePointer6Handler = exports.uploadCertificatesHandler = exports.uploadCertificatesMiddleware = exports.uploadCourseListHandler = exports.uploadCourseListMiddleware = void 0;
const resolveRole_1 = require("../utils/resolveRole");
const multer_1 = __importDefault(require("multer"));
const pointer6_service_1 = require("../services/pointer6.service");
const ivyScore_service_1 = require("../services/ivyScore.service");
const PointerNo_1 = require("../types/PointerNo");
const Pointer6Certificate_1 = __importDefault(require("../models/ivy/Pointer6Certificate"));
const Pointer6Evaluation_1 = __importDefault(require("../models/ivy/Pointer6Evaluation"));
// Multer in-memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
/** POST /pointer6/course-list/upload (Ivy Expert only) */
exports.uploadCourseListMiddleware = upload.single('courseListFile');
const uploadCourseListHandler = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const { studentIvyServiceId } = req.body;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(req.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        const courseList = await (0, pointer6_service_1.uploadCourseList)(studentIvyServiceId, ivyExpertId, req.file);
        res.status(200).json({
            success: true,
            message: 'Course list uploaded successfully',
            data: {
                _id: courseList._id,
                fileName: courseList.fileName,
                fileUrl: courseList.fileUrl,
                uploadedAt: courseList.uploadedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload course list',
        });
    }
};
exports.uploadCourseListHandler = uploadCourseListHandler;
/** POST /pointer6/certificate/upload (Student only, multiple files) */
exports.uploadCertificatesMiddleware = upload.array('certificates', 10);
const uploadCertificatesHandler = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No certificate files uploaded' });
            return;
        }
        const { studentIvyServiceId } = req.body;
        const studentId = await (0, resolveRole_1.resolveStudentId)(req.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        const certificates = await (0, pointer6_service_1.uploadCertificates)(studentIvyServiceId, studentId, files);
        res.status(200).json({
            success: true,
            message: 'Certificates uploaded successfully',
            data: certificates.map((c) => ({
                _id: c._id,
                fileName: c.fileName,
                fileUrl: c.fileUrl,
                uploadedAt: c.uploadedAt,
            })),
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload certificates',
        });
    }
};
exports.uploadCertificatesHandler = uploadCertificatesHandler;
/** POST /pointer6/evaluate (Ivy Expert only) */
const evaluatePointer6Handler = async (req, res) => {
    try {
        const { studentIvyServiceId, score, feedback } = req.body;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(req.user.userId);
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        if (score === undefined || score === null) {
            res.status(400).json({ success: false, message: 'score is required (0-10)' });
            return;
        }
        const evaluation = await (0, pointer6_service_1.evaluatePointer6)(studentIvyServiceId, ivyExpertId, Number(score), feedback);
        // Update overall Ivy score
        await (0, ivyScore_service_1.updateScoreAfterEvaluation)(evaluation.studentIvyServiceId.toString(), PointerNo_1.PointerNo.IntellectualCuriosity, evaluation.score);
        res.status(200).json({
            success: true,
            message: 'Pointer 6 evaluated successfully',
            data: {
                _id: evaluation._id,
                score: evaluation.score,
                feedback: evaluation.feedback,
                evaluatedAt: evaluation.evaluatedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to evaluate Pointer 6',
        });
    }
};
exports.evaluatePointer6Handler = evaluatePointer6Handler;
/** GET /pointer6/status/:studentId or /pointer6/status?studentIvyServiceId=xxx */
const getPointer6StatusHandler = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { studentIvyServiceId } = req.query;
        const identifier = studentIvyServiceId ? studentIvyServiceId : studentId;
        const useServiceId = !!studentIvyServiceId;
        if (!identifier) {
            res.status(400).json({
                success: false,
                message: 'studentId or studentIvyServiceId is required',
            });
            return;
        }
        const status = await (0, pointer6_service_1.getPointer6Status)(identifier, useServiceId);
        res.status(200).json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get Pointer 6 status',
        });
    }
};
exports.getPointer6StatusHandler = getPointer6StatusHandler;
/** PUT /pointer6/certificate/:certificateId/replace (Student only) */
exports.replaceCertificateMiddleware = upload.single('certificate');
const replaceCertificateHandler = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const { certificateId } = req.params;
        const studentId = await (0, resolveRole_1.resolveStudentId)(req.user.userId);
        if (!certificateId) {
            res.status(400).json({ success: false, message: 'certificateId is required' });
            return;
        }
        const certificate = await (0, pointer6_service_1.replaceCertificate)(certificateId, studentId, req.file);
        res.status(200).json({
            success: true,
            message: 'Certificate replaced successfully. Please wait for re-evaluation.',
            data: {
                _id: certificate._id,
                fileName: certificate.fileName,
                fileUrl: certificate.fileUrl,
                uploadedAt: certificate.uploadedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to replace certificate',
        });
    }
};
exports.replaceCertificateHandler = replaceCertificateHandler;
/** DELETE /pointer6/certificate/:certificateId (Student only) */
const deleteCertificateHandler = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const studentId = await (0, resolveRole_1.resolveStudentId)(req.user.userId);
        if (!certificateId) {
            res.status(400).json({ success: false, message: 'certificateId is required' });
            return;
        }
        await (0, pointer6_service_1.deleteCertificate)(certificateId, studentId);
        res.status(200).json({
            success: true,
            message: 'Certificate deleted successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete certificate',
        });
    }
};
exports.deleteCertificateHandler = deleteCertificateHandler;
/** POST /pointer6/certificate/:certificateId/evaluate (Ivy Expert only) */
const evaluateCertificateHandler = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const { score, feedback } = req.body;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(req.user.userId);
        if (!certificateId) {
            res.status(400).json({ success: false, message: 'certificateId is required' });
            return;
        }
        if (score === undefined || score === null) {
            res.status(400).json({ success: false, message: 'score is required (0-10)' });
            return;
        }
        const evaluation = await (0, pointer6_service_1.evaluateCertificate)(certificateId, ivyExpertId, Number(score), feedback);
        res.status(200).json({
            success: true,
            message: 'Certificate evaluated successfully',
            data: {
                _id: evaluation._id,
                certificateId: evaluation.certificateId,
                score: evaluation.score,
                feedback: evaluation.feedback,
                evaluatedAt: evaluation.evaluatedAt,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to evaluate certificate',
        });
    }
};
exports.evaluateCertificateHandler = evaluateCertificateHandler;
const getPointer6ScoreHandler = async (req, res) => {
    try {
        const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        const certificates = await Pointer6Certificate_1.default.find({ studentIvyServiceId });
        if (certificates.length === 0) {
            res.status(200).json({ success: true, data: 0 });
            return;
        }
        const certificateIds = certificates.map((c) => c._id);
        const evaluations = await Pointer6Evaluation_1.default.find({
            certificateId: { $in: certificateIds },
        });
        if (evaluations.length === 0) {
            res.status(200).json({ success: true, data: 0 });
            return;
        }
        const averageScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.score || 0), 0) / evaluations.length;
        res.status(200).json({
            success: true,
            data: averageScore,
        });
    }
    catch (error) {
        console.error('Get pointer6 score error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pointer6 score',
        });
    }
};
exports.getPointer6ScoreHandler = getPointer6ScoreHandler;
/** POST /pointer6/select-course - Select a course with start and end dates */
const selectCourseHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, courseId, startDate, endDate } = req.body;
        const studentId = await (0, resolveRole_1.resolveStudentId)(req.user.userId);
        if (!studentIvyServiceId || !courseId || !startDate || !endDate) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId, courseId, startDate, and endDate are required'
            });
            return;
        }
        const selection = await (0, pointer6_service_1.selectCourse)(studentIvyServiceId, courseId, new Date(startDate), new Date(endDate), studentId);
        res.status(200).json({
            success: true,
            message: 'Course selected successfully',
            data: selection,
        });
    }
    catch (error) {
        console.error('Select course error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to select course',
        });
    }
};
exports.selectCourseHandler = selectCourseHandler;
/** POST /pointer6/unselect-course - Unselect a course */
const unselectCourseHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, courseId } = req.body;
        if (!studentIvyServiceId || !courseId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId and courseId are required'
            });
            return;
        }
        await (0, pointer6_service_1.unselectCourse)(studentIvyServiceId, courseId);
        res.status(200).json({
            success: true,
            message: 'Course unselected successfully',
        });
    }
    catch (error) {
        console.error('Unselect course error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to unselect course',
        });
    }
};
exports.unselectCourseHandler = unselectCourseHandler;
/** POST /pointer6/upload-course-certificate - Upload certificate for selected course (Student) */
exports.uploadCourseCertificateMiddleware = upload.single('certificate');
const uploadCourseCertificateHandler = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const { studentIvyServiceId, courseId } = req.body;
        const studentId = await (0, resolveRole_1.resolveStudentId)(req.user.userId);
        if (!studentIvyServiceId || !courseId) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId and courseId are required'
            });
            return;
        }
        const selectedCourse = await (0, pointer6_service_1.uploadCourseCertificate)(studentIvyServiceId, courseId, studentId, req.file);
        res.status(200).json({
            success: true,
            message: 'Certificate uploaded successfully',
            data: selectedCourse,
        });
    }
    catch (error) {
        console.error('Upload course certificate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload certificate',
        });
    }
};
exports.uploadCourseCertificateHandler = uploadCourseCertificateHandler;
/** POST /pointer6/score-course-certificate - Score a course certificate (Ivy Expert) */
const scoreCourseCertificateHandler = async (req, res) => {
    try {
        const { studentIvyServiceId, courseId, score } = req.body;
        const ivyExpertId = await (0, resolveRole_1.resolveIvyExpertId)(req.user.userId);
        if (!studentIvyServiceId || !courseId || score === undefined) {
            res.status(400).json({
                success: false,
                message: 'studentIvyServiceId, courseId, and score are required'
            });
            return;
        }
        const selectedCourse = await (0, pointer6_service_1.scoreCourseCertificate)(studentIvyServiceId, courseId, ivyExpertId, Number(score));
        res.status(200).json({
            success: true,
            message: 'Certificate scored successfully',
            data: selectedCourse,
        });
    }
    catch (error) {
        console.error('Score course certificate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to score certificate',
        });
    }
};
exports.scoreCourseCertificateHandler = scoreCourseCertificateHandler;
/** GET /pointer6/course-score - Get Pointer 6 average score */
const getPointer6CourseScoreHandler = async (req, res) => {
    try {
        const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;
        if (!studentIvyServiceId) {
            res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
            return;
        }
        const score = await (0, pointer6_service_1.getPointer6Score)(studentIvyServiceId);
        res.status(200).json({
            success: true,
            data: { score },
        });
    }
    catch (error) {
        console.error('Get pointer6 course score error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pointer6 course score',
        });
    }
};
exports.getPointer6CourseScoreHandler = getPointer6CourseScoreHandler;
//# sourceMappingURL=pointer6.controller.js.map