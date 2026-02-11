"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeightages = exports.evaluateActivity = exports.uploadProof = exports.getStudentActivities = exports.selectActivities = exports.saveFile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const IvyExpertSelectedSuggestion_1 = __importDefault(require("../models/ivy/IvyExpertSelectedSuggestion"));
const StudentSubmission_1 = __importDefault(require("../models/ivy/StudentSubmission"));
const IvyExpertEvaluation_1 = __importDefault(require("../models/ivy/IvyExpertEvaluation"));
const AgentSuggestion_1 = __importDefault(require("../models/ivy/AgentSuggestion"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const IvyExpert_1 = __importDefault(require("../models/IvyExpert"));
const Student_1 = __importDefault(require("../models/Student"));
const Service_1 = __importDefault(require("../models/Service"));
const PointerNo_1 = require("../types/PointerNo");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ivyScore_service_1 = require("./ivyScore.service");
const notification_service_1 = require("./notification.service");
const uploadDir_1 = require("../utils/uploadDir");
// File storage directory
const UPLOAD_DIR = path_1.default.join((0, uploadDir_1.getUploadBaseDir)(), 'pointer234');
(0, uploadDir_1.ensureDir)(UPLOAD_DIR);
/**
 * Save uploaded file to local storage
 */
const saveFile = async (file, subfolder) => {
    const folderPath = path_1.default.join(UPLOAD_DIR, subfolder);
    (0, uploadDir_1.ensureDir)(folderPath);
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path_1.default.join(folderPath, fileName);
    fs_1.default.writeFileSync(filePath, file.buffer);
    // Return relative path for storage in DB
    return `/uploads/pointer234/${subfolder}/${fileName}`;
};
exports.saveFile = saveFile;
/**
 * Select activities (Ivy Expert only)
 * Input: studentIvyServiceId, ivyExpertId, agentSuggestionIds (array), pointerNo (2|3|4), weightages (optional for Pointer 2)
 */
const selectActivities = async (studentIvyServiceId, ivyExpertId, agentSuggestionIds, pointerNo, weightages // Optional weightages for Pointer 2
) => {
    // Validate studentIvyServiceId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    // Validate ivyExpertId
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    // Validate pointerNo (must be 2, 3, or 4)
    if (![PointerNo_1.PointerNo.SpikeInOneArea, PointerNo_1.PointerNo.LeadershipInitiative, PointerNo_1.PointerNo.GlobalSocialImpact].includes(pointerNo)) {
        throw new Error('Invalid pointerNo. Must be 2, 3, or 4');
    }
    // Validate agentSuggestionIds
    if (!Array.isArray(agentSuggestionIds) || agentSuggestionIds.length === 0) {
        throw new Error('agentSuggestionIds must be a non-empty array');
    }
    // Validate weightages for Pointer 2
    if (pointerNo === PointerNo_1.PointerNo.SpikeInOneArea) {
        if (agentSuggestionIds.length === 1) {
            // Auto-assign 100 for single activity
            weightages = [100];
        }
        else {
            // Multiple activities require weightages
            if (!weightages || !Array.isArray(weightages) || weightages.length !== agentSuggestionIds.length) {
                throw new Error('Weightages array must match the number of activities for Pointer 2');
            }
            // Validate each weightage is a positive number
            for (const w of weightages) {
                if (typeof w !== 'number' || w <= 0 || w > 100) {
                    throw new Error('Each weightage must be a number between 0 and 100');
                }
            }
            // Validate sum equals 100
            const sum = weightages.reduce((acc, w) => acc + w, 0);
            if (Math.abs(sum - 100) > 0.01) { // Allow small floating point tolerance
                throw new Error(`Total weightage must equal 100, got ${sum}`);
            }
        }
    }
    // Verify studentIvyService exists and ivyExpert matches
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
        throw new Error('Unauthorized: Ivy Expert does not match this service');
    }
    // Verify ivyExpert exists
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: IvyExpert not found');
    }
    // Verify all agent suggestions exist and match pointerNo
    const agentSuggestions = await AgentSuggestion_1.default.find({
        _id: { $in: agentSuggestionIds },
        pointerNo,
    });
    if (agentSuggestions.length !== agentSuggestionIds.length) {
        throw new Error('One or more agent suggestions not found or do not match pointerNo');
    }
    // Delete existing selections for this pointer and student service
    await IvyExpertSelectedSuggestion_1.default.deleteMany({
        studentIvyServiceId,
        pointerNo,
    });
    // Create new selections with weightages for Pointer 2
    const selectedActivities = await IvyExpertSelectedSuggestion_1.default.insertMany(agentSuggestionIds.map((agentSuggestionId, index) => ({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        agentSuggestionId: new mongoose_1.default.Types.ObjectId(agentSuggestionId),
        pointerNo,
        isVisibleToStudent: true, // Auto-visible when selected
        ...(pointerNo === PointerNo_1.PointerNo.SpikeInOneArea && weightages ? { weightage: weightages[index] } : {}),
    })));
    // Create notification to alert student about new activities
    await (0, notification_service_1.createNotification)({
        studentIvyServiceId,
        userId: service.studentId,
        userRole: 'student',
        pointerNumber: pointerNo,
        notificationType: 'activities_assigned',
        referenceId: selectedActivities[0]._id,
    });
    return selectedActivities;
};
exports.selectActivities = selectActivities;
/**
 * Get student activities with status (for student, parent, ivyExpert views)
 * Returns activities with proof upload status and evaluation status
 */
const getStudentActivities = async (studentId, studentIvyServiceId) => {
    // Validate studentId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }
    // Find student's Ivy service — use studentIvyServiceId directly if provided
    let service;
    if (studentIvyServiceId && mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    }
    if (!service) {
        // Fallback: filter by Ivy League service to avoid wrong registration
        const ivySvc = await Service_1.default.findOne({ slug: 'ivy-league' }).select('_id');
        const filter = { studentId };
        if (ivySvc)
            filter.serviceId = ivySvc._id;
        service = await StudentServiceRegistration_1.default.findOne(filter);
    }
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    // Get all selected activities for this student
    const selectedActivities = await IvyExpertSelectedSuggestion_1.default.find({
        studentIvyServiceId: service._id,
        pointerNo: { $in: [PointerNo_1.PointerNo.SpikeInOneArea, PointerNo_1.PointerNo.LeadershipInitiative, PointerNo_1.PointerNo.GlobalSocialImpact] },
    }).populate('agentSuggestionId');
    // Get all submissions and evaluations
    const submissions = await StudentSubmission_1.default.find({
        studentIvyServiceId: service._id,
    }).populate('ivyExpertSelectedSuggestionId');
    const evaluations = await IvyExpertEvaluation_1.default.find({
        studentSubmissionId: { $in: submissions.map((s) => s._id) },
    });
    // Build result array with activity details and status
    const activities = selectedActivities.map((selected) => {
        const agentSuggestion = selected.agentSuggestionId;
        const submission = submissions.find((s) => s.ivyExpertSelectedSuggestionId.toString() === selected._id.toString());
        const evaluation = submission
            ? evaluations.find((e) => e.studentSubmissionId.toString() === submission._id.toString())
            : null;
        return {
            selectedActivityId: selected._id,
            agentSuggestionId: agentSuggestion._id,
            pointerNo: selected.pointerNo,
            title: agentSuggestion.title,
            description: agentSuggestion.description,
            tags: agentSuggestion.tags || [],
            selectedAt: selected.selectedAt,
            weightage: selected.weightage, // Include weightage for Pointer 2
            proofUploaded: !!submission,
            submission: submission
                ? {
                    _id: submission._id,
                    files: submission.files,
                    remarks: submission.remarks,
                    submittedAt: submission.submittedAt,
                }
                : null,
            evaluated: !!evaluation,
            evaluation: evaluation
                ? {
                    _id: evaluation._id,
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    evaluatedAt: evaluation.evaluatedAt,
                }
                : null,
        };
    });
    return activities;
};
exports.getStudentActivities = getStudentActivities;
/**
 * Upload proof for an activity (Student only)
 * Input: studentIvyServiceId, studentId, ivyExpertSelectedSuggestionId, files (array)
 */
const uploadProof = async (studentIvyServiceId, studentId, ivyExpertSelectedSuggestionId, files) => {
    // Validate studentIvyServiceId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    // Validate studentId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid studentId');
    }
    // Validate ivyExpertSelectedSuggestionId
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertSelectedSuggestionId)) {
        throw new Error('Invalid ivyExpertSelectedSuggestionId');
    }
    // Validate files
    if (!files || files.length === 0) {
        throw new Error('At least one file is required');
    }
    // Verify studentIvyService exists and student matches
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    if (service.studentId.toString() !== studentId) {
        throw new Error('Unauthorized: Student does not match this service');
    }
    // Verify student exists
    const student = await Student_1.default.findById(studentId);
    if (!student) {
        throw new Error('Unauthorized: Student not found');
    }
    // Verify selected activity exists and belongs to this student service
    const selectedActivity = await IvyExpertSelectedSuggestion_1.default.findById(ivyExpertSelectedSuggestionId);
    if (!selectedActivity) {
        throw new Error('Selected activity not found');
    }
    if (selectedActivity.studentIvyServiceId.toString() !== studentIvyServiceId) {
        throw new Error('Unauthorized: Activity does not belong to this student service');
    }
    // Validate file types (PDF, images, Word docs)
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    for (const file of files) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`Invalid file type: ${file.originalname}. Allowed: PDF, images (JPG/PNG), Word documents`);
        }
    }
    // Save all files
    const fileUrls = [];
    for (const file of files) {
        const fileUrl = await (0, exports.saveFile)(file, 'proofs');
        fileUrls.push(fileUrl);
    }
    // Check if submission already exists (update)
    const existing = await StudentSubmission_1.default.findOne({
        ivyExpertSelectedSuggestionId,
    });
    if (existing) {
        // Append new files to existing files (don't delete old files)
        existing.files = [...existing.files, ...fileUrls];
        existing.submittedAt = new Date();
        await existing.save();
        // Note: We don't delete the evaluation because we're just adding more proof files
        // The ivyExpert can review the additional files without re-evaluating
        return existing;
    }
    // Create new submission
    const submission = await StudentSubmission_1.default.create({
        studentIvyServiceId: new mongoose_1.default.Types.ObjectId(studentIvyServiceId),
        ivyExpertSelectedSuggestionId: new mongoose_1.default.Types.ObjectId(ivyExpertSelectedSuggestionId),
        files: fileUrls,
        submittedAt: new Date(),
    });
    // Create notification to alert ivyExpert about proof upload
    if (service.activeIvyExpertId) {
        await (0, notification_service_1.createNotification)({
            studentIvyServiceId,
            userId: service.activeIvyExpertId,
            userRole: 'ivyExpert',
            pointerNumber: selectedActivity.pointerNo,
            notificationType: 'activity_proof_uploaded',
            referenceId: submission._id,
        });
    }
    return submission;
};
exports.uploadProof = uploadProof;
/**
 * Evaluate activity (Ivy Expert only)
 * Input: studentSubmissionId, ivyExpertId, score, feedback?
 */
const evaluateActivity = async (studentSubmissionId, ivyExpertId, score, feedback) => {
    // Validate score range
    if (score < 0 || score > 10) {
        throw new Error('Score must be between 0 and 10');
    }
    // Validate studentSubmissionId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentSubmissionId)) {
        throw new Error('Invalid studentSubmissionId');
    }
    // Validate ivyExpertId
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    // Verify submission exists
    const submission = await StudentSubmission_1.default.findById(studentSubmissionId).populate('ivyExpertSelectedSuggestionId');
    if (!submission) {
        throw new Error('Student submission not found');
    }
    // Get pointerNo from selected activity
    const selectedActivity = submission.ivyExpertSelectedSuggestionId;
    const pointerNo = selectedActivity.pointerNo;
    // Verify ivyExpert matches the service
    const service = await StudentServiceRegistration_1.default.findById(submission.studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
        throw new Error('Unauthorized: Ivy Expert does not match this service');
    }
    // Verify ivyExpert exists
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: IvyExpert not found');
    }
    // Check if evaluation already exists (update)
    const existing = await IvyExpertEvaluation_1.default.findOne({ studentSubmissionId });
    if (existing) {
        existing.score = score;
        existing.feedback = feedback || '';
        existing.evaluatedAt = new Date();
        await existing.save();
    }
    else {
        // Create new evaluation
        await IvyExpertEvaluation_1.default.create({
            studentSubmissionId: new mongoose_1.default.Types.ObjectId(studentSubmissionId),
            pointerNo,
            score,
            feedback: feedback || '',
            evaluatedAt: new Date(),
        });
    }
    // Recalculate average score for this pointer
    const finalEvaluation = await IvyExpertEvaluation_1.default.findOne({ studentSubmissionId });
    await refreshPointerAverageScore(service._id.toString(), pointerNo);
    return finalEvaluation;
};
exports.evaluateActivity = evaluateActivity;
/**
 * Update weightages for selected activities (Ivy Expert only)
 * Input: studentIvyServiceId, ivyExpertId, weightages map { agentSuggestionId: weightage }, pointerNo
 */
const updateWeightages = async (studentIvyServiceId, ivyExpertId, weightages, pointerNo) => {
    // Validate studentIvyServiceId
    if (!mongoose_1.default.Types.ObjectId.isValid(studentIvyServiceId)) {
        throw new Error('Invalid studentIvyServiceId');
    }
    // Validate ivyExpertId
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid ivyExpertId');
    }
    // Verify studentIvyService exists and ivyExpert matches
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student Service Registration not found');
    }
    if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
        throw new Error('Unauthorized: Ivy Expert does not match this service');
    }
    // Verify ivyExpert exists
    const ivyExpert = await IvyExpert_1.default.findById(ivyExpertId);
    if (!ivyExpert) {
        throw new Error('Unauthorized: IvyExpert not found');
    }
    // Build query for selected activities - all pointers 2, 3, 4 or specific pointer
    const query = { studentIvyServiceId };
    if (pointerNo && [2, 3, 4].includes(pointerNo)) {
        query.pointerNo = pointerNo;
    }
    else {
        // Update for all pointers 2, 3, 4
        query.pointerNo = { $in: [PointerNo_1.PointerNo.SpikeInOneArea, PointerNo_1.PointerNo.LeadershipInitiative, PointerNo_1.PointerNo.GlobalSocialImpact] };
    }
    const selectedActivities = await IvyExpertSelectedSuggestion_1.default.find(query);
    if (selectedActivities.length === 0) {
        throw new Error('No activities selected');
    }
    // Filter activities to only those in the weightages object
    const activitiesToUpdate = selectedActivities.filter(act => weightages[act.agentSuggestionId.toString()] !== undefined);
    if (activitiesToUpdate.length === 0) {
        throw new Error('No matching activities found for provided weightages');
    }
    // Validate weightages sum to 100 for the activities being updated
    const weightageValues = activitiesToUpdate.map(act => weightages[act.agentSuggestionId.toString()]);
    if (activitiesToUpdate.length === 1) {
        // Single activity must have 100
        if (weightageValues[0] !== 100) {
            throw new Error('Single activity must have weightage of 100');
        }
    }
    else {
        // Multiple activities must sum to 100
        const sum = weightageValues.reduce((acc, w) => acc + w, 0);
        if (Math.abs(sum - 100) > 0.01) {
            throw new Error(`Total weightage must equal 100, got ${sum.toFixed(2)}`);
        }
        // Each weightage must be valid
        for (const w of weightageValues) {
            if (typeof w !== 'number' || w <= 0 || w > 100) {
                throw new Error('Each weightage must be a number between 0 and 100');
            }
        }
    }
    // Update weightages
    const updatedActivities = [];
    for (const activity of activitiesToUpdate) {
        const agentSuggestionId = activity.agentSuggestionId.toString();
        activity.weightage = weightages[agentSuggestionId];
        await activity.save();
        updatedActivities.push(activity);
    }
    console.log(`Updated ${updatedActivities.length} activities with weightages`);
    return updatedActivities;
};
exports.updateWeightages = updateWeightages;
/**
 * Recalculates the average score for a given pointer and updates the Ivy ready score.
 */
const refreshPointerAverageScore = async (studentIvyServiceId, pointerNo) => {
    const studentSubmissions = await StudentSubmission_1.default.find({ studentIvyServiceId });
    const submissionIds = studentSubmissions.map(s => s._id);
    const evaluations = await IvyExpertEvaluation_1.default.find({
        studentSubmissionId: { $in: submissionIds },
        pointerNo: Number(pointerNo)
    });
    let averageScore = 0;
    if (evaluations.length > 0) {
        averageScore = evaluations.reduce((sum, ev) => sum + ev.score, 0) / evaluations.length;
    }
    await (0, ivyScore_service_1.updateScoreAfterEvaluation)(studentIvyServiceId, Number(pointerNo), averageScore);
};
//# sourceMappingURL=pointer234Activity.service.js.map