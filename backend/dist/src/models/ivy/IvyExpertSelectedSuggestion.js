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
const documentTaskSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    page: { type: Number },
    status: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' }
}, { _id: false });
const ivyExpertDocumentSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    tasks: { type: [documentTaskSchema], default: [] }
}, { _id: false });
const ivyExpertSelectedSuggestionSchema = new mongoose_1.Schema({
    studentIvyServiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
    agentSuggestionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AgentSuggestion', required: true },
    pointerNo: { type: Number, enum: Object.values(PointerNo_1.PointerNo).filter(v => typeof v === 'number'), required: true },
    isVisibleToStudent: { type: Boolean, default: false, required: true },
    weightage: { type: Number, min: 0, max: 100 },
    ivyExpertDocuments: { type: [ivyExpertDocumentSchema], default: [] },
    deadline: { type: Date },
    selectedAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model('IvyExpertSelectedSuggestion', ivyExpertSelectedSuggestionSchema);
//# sourceMappingURL=IvyExpertSelectedSuggestion.js.map