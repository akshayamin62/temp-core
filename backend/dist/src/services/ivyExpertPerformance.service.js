"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIvyExpertPerformance = void 0;
const IvyExpert_1 = __importDefault(require("../models/IvyExpert"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const StudentIvyScoreCard_1 = __importDefault(require("../models/ivy/StudentIvyScoreCard"));
const StudentSubmission_1 = __importDefault(require("../models/ivy/StudentSubmission"));
const IvyExpertEvaluation_1 = __importDefault(require("../models/ivy/IvyExpertEvaluation"));
const EssaySubmission_1 = __importDefault(require("../models/ivy/EssaySubmission"));
const EssayEvaluation_1 = __importDefault(require("../models/ivy/EssayEvaluation"));
const getIvyExpertPerformance = async () => {
    // 1. Get all IvyExpert records with their User data
    const ivyExpertRecords = await IvyExpert_1.default.find({}).populate('userId', 'firstName lastName email');
    const metrics = [];
    for (const expert of ivyExpertRecords) {
        const user = expert.userId; // populated User doc
        if (!user)
            continue;
        // 2. Get students handled (registrations where this IvyExpert is the active ivy expert)
        const services = await StudentServiceRegistration_1.default.find({ activeIvyExpertId: expert._id });
        const studentsHandled = services.length;
        const serviceIds = services.map(s => s._id);
        if (studentsHandled === 0) {
            metrics.push({
                ivyExpertId: expert._id.toString(),
                ivyExpertName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                studentsHandled: 0,
                averageStudentScore: 0,
                taskCompletionRate: 0,
            });
            continue;
        }
        // 3. Average Student Score
        const scoreCards = await StudentIvyScoreCard_1.default.find({
            studentIvyServiceId: { $in: serviceIds },
        });
        let totalScore = 0;
        if (scoreCards.length > 0) {
            totalScore = scoreCards.reduce((sum, card) => sum + card.overallScore, 0);
        }
        const averageStudentScore = scoreCards.length > 0 ? (totalScore / scoreCards.length) : 0;
        // 4. Task Completion Rate
        // Metric: (Completed Evaluations / Total Submissions) * 100
        // We check Generic Pointers (Activities) + Essay + Pointer 6
        // A. Generic Activities (Pointers 2-4)
        // Find all submissions for this ivyExpert's students
        const studentSubmissions = await StudentSubmission_1.default.find({
            studentIvyServiceId: { $in: serviceIds }
        });
        const subIds = studentSubmissions.map(s => s._id);
        const activityEvaluations = await IvyExpertEvaluation_1.default.find({
            studentSubmissionId: { $in: subIds }
        });
        // B. Essay (Pointer 5)
        // Find all essay submissions for this ivyExpert's students
        // Note: EssaySubmission doesn't strictly have a direct 'evaluated' flag, we check EssayEvaluation
        const essaySubmissions = await EssaySubmission_1.default.find({
            studentIvyServiceId: { $in: serviceIds }
        });
        const essaySubIds = essaySubmissions.map(s => s._id);
        const essayEvaluations = await EssayEvaluation_1.default.find({
            essaySubmissionId: { $in: essaySubIds }
        });
        // C. Pointer 6 (Curiosity) doesn't have "submissions" in the same way (course list + certs).
        // Usually P6 is evaluated once per student.
        // Let's stick to Activity + Essay for "Task Completion Rate" as they are the bulk of work.
        const totalSubmissions = studentSubmissions.length + essaySubmissions.length;
        const totalEvaluations = activityEvaluations.length + essayEvaluations.length;
        let taskCompletionRate = 0;
        if (totalSubmissions > 0) {
            taskCompletionRate = (totalEvaluations / totalSubmissions) * 100;
            // Cap at 100 just in case (though math shouldn't allow >100 unless data inconsistency)
            taskCompletionRate = Math.min(100, taskCompletionRate);
        }
        else {
            // If no submissions, assume 100% (nothing pending) or 0%?
            // "N/A" is better, but defaulting to 100 (kept up to date) or 0.
            // If they have students but no submissions, they might be waiting. Let's say 100% "up to date".
            // Actually, standard is usually 0 if no data, or ignore.
            // Let's use 0 ensures they get attention if they have students but no activity.
            // But if students haven't submitted, it's not ivyExpert fault.
            // Let's calculate rate ONLY if there are submissions.
            taskCompletionRate = totalSubmissions > 0 ? (totalEvaluations / totalSubmissions) * 100 : 0;
        }
        metrics.push({
            ivyExpertId: expert._id.toString(),
            ivyExpertName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            studentsHandled,
            averageStudentScore,
            taskCompletionRate,
        });
    }
    return metrics;
};
exports.getIvyExpertPerformance = getIvyExpertPerformance;
//# sourceMappingURL=ivyExpertPerformance.service.js.map