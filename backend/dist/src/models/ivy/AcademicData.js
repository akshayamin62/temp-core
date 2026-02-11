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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SubjectSchema = new mongoose_1.Schema({
    name: { type: String, default: '' },
    marksObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 100 },
    feedback: { type: String, default: '' }
});
const FormalSubSectionSchema = new mongoose_1.Schema({
    testType: {
        type: String,
        enum: ['weekly', 'month-wise', 'term-wise', 'final-term'],
        default: 'weekly'
    },
    month: { type: String, default: 'January' },
    year: { type: Number, default: new Date().getFullYear() },
    subjects: [SubjectSchema],
    overallFeedback: { type: String, default: '' },
    score: { type: Number, min: 0, max: 10, default: 0 }
});
const InformalSubSectionSchema = new mongoose_1.Schema({
    testType: {
        type: String,
        enum: ['olympiad', 'test'],
        default: 'olympiad'
    },
    month: { type: String, default: 'January' },
    year: { type: Number, default: new Date().getFullYear() },
    subjects: [SubjectSchema],
    overallFeedback: { type: String, default: '' },
    score: { type: Number, min: 0, max: 10, default: 0 }
});
const FormalSectionSchema = new mongoose_1.Schema({
    examName: { type: String, required: true },
    subSections: [FormalSubSectionSchema]
});
const InformalSectionSchema = new mongoose_1.Schema({
    examName: { type: String, required: true },
    subSections: [InformalSubSectionSchema],
    weightage: { type: Number, min: 0, max: 100, default: 0 }
});
const AcademicDataSchema = new mongoose_1.Schema({
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    studentIvyServiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StudentServiceRegistration',
        required: true
    },
    formal: {
        sections: [FormalSectionSchema]
    },
    informal: {
        sections: [InformalSectionSchema]
    }
}, {
    timestamps: true
});
// Compound index for unique student-service combination
AcademicDataSchema.index({ studentId: 1, studentIvyServiceId: 1 }, { unique: true });
exports.default = mongoose_1.default.model('AcademicData', AcademicDataSchema);
//# sourceMappingURL=AcademicData.js.map