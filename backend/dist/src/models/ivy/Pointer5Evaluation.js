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
const Pointer5EvaluationSchema = new mongoose_1.Schema({
    submissionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Pointer5Submission',
        required: true,
    },
    taskId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Pointer5Task',
        required: true,
    },
    studentIvyServiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StudentServiceRegistration',
        required: true,
    },
    ivyExpertId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 10,
    },
    feedback: {
        type: String,
        default: '',
    },
    evaluatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });
const Pointer5EvaluationModel = mongoose_1.default.model('Pointer5Evaluation', Pointer5EvaluationSchema);
// Drop stale unique index on studentIvyServiceId if it exists (from older schema).
// A student can have multiple evaluations (one per task), so this must NOT be unique.
Pointer5EvaluationModel.collection.dropIndex('studentIvyServiceId_1').catch(() => {
    // Index may not exist — ignore
});
exports.default = Pointer5EvaluationModel;
//# sourceMappingURL=Pointer5Evaluation.js.map