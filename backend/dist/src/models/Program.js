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
const programSchema = new mongoose_1.Schema({
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Student",
        required: false,
    },
    university: {
        type: String,
        required: true,
    },
    universityRanking: {
        webometricsWorld: { type: Number, required: false },
        webometricsNational: { type: Number, required: false },
        usNews: { type: Number, required: false },
        qs: { type: Number, required: false },
    },
    programName: {
        type: String,
        required: true,
    },
    programUrl: {
        type: String,
        required: true,
    },
    campus: {
        type: String,
        required: false,
    },
    country: {
        type: String,
        required: true,
    },
    studyLevel: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: false,
    },
    ieltsScore: {
        type: Number,
        required: false,
    },
    applicationFee: {
        type: Number,
        required: false,
    },
    yearlyTuitionFees: {
        type: Number,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
    intake: {
        type: String,
        required: false,
    },
    year: {
        type: String,
        required: false,
    },
    selectedAt: {
        type: Date,
        required: false,
    },
    isSelectedByStudent: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
// Database indexes for performance
programSchema.index({ studentId: 1, isSelectedByStudent: 1 });
programSchema.index({ createdBy: 1, createdAt: -1 });
programSchema.index({ country: 1, studyLevel: 1 });
programSchema.index({ university: 1, programName: 1 });
exports.default = mongoose_1.default.model("Program", programSchema);
//# sourceMappingURL=Program.js.map