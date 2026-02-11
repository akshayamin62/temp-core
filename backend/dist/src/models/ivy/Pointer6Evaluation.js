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
const PointerNo_1 = require("../../types/PointerNo");
const pointer6EvaluationSchema = new mongoose_1.Schema({
    studentIvyServiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true, unique: true },
    pointerNo: {
        type: Number,
        enum: [PointerNo_1.PointerNo.IntellectualCuriosity],
        required: true,
        default: PointerNo_1.PointerNo.IntellectualCuriosity,
    },
    score: { type: Number, required: true, min: 0, max: 10 },
    feedback: { type: String },
    evaluatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    evaluatedAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model('Pointer6Evaluation', pointer6EvaluationSchema);
//# sourceMappingURL=Pointer6Evaluation.js.map