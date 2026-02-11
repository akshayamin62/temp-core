"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Answer = void 0;
const mongoose_1 = require("mongoose");
const updateHistorySchema = new mongoose_1.Schema({
    value: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: String,
        enum: ['STUDENT', 'COUNSELOR', 'ADMIN'],
        required: true,
    },
    updatedByUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { _id: false });
const questionValueSchema = new mongoose_1.Schema({
    question: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed, // Can be string, number, date, array, etc.
    },
    updateHistory: [updateHistorySchema],
}, { _id: false });
const sectionAnswerSchema = new mongoose_1.Schema({
    section: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'FormSection',
        required: true,
    },
    sectionInstanceId: {
        type: String,
        required: true, // UUID for repeatable sections, or default ID for non-repeatable
    },
    values: [questionValueSchema],
}, { _id: false });
const answerSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        unique: true, // ONE answer document per student
    },
    answers: [sectionAnswerSchema],
}, {
    timestamps: true,
});
// Index for fast student lookup
answerSchema.index({ student: 1 });
answerSchema.index({ 'answers.section': 1 });
exports.Answer = (0, mongoose_1.model)('Answer', answerSchema);
//# sourceMappingURL=Answer.js.map