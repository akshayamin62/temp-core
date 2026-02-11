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
const TaskMessageSchema = new mongoose_1.Schema({
    sender: { type: String, enum: ['student', 'ivyExpert'], required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    messageType: { type: String, enum: ['normal', 'feedback', 'action', 'resource'], default: 'normal' },
    attachment: {
        name: String,
        url: String,
        size: String,
    },
}, { _id: true });
const TaskConversationSchema = new mongoose_1.Schema({
    studentIvyServiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
    selectionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'IvyExpertSelectedSuggestion', required: true },
    taskTitle: { type: String, required: true },
    taskPage: { type: String },
    messages: [TaskMessageSchema],
}, { timestamps: true });
// Compound index to ensure one conversation per task
// Sparse index allows multiple documents with null/undefined taskPage
TaskConversationSchema.index({ selectionId: 1, taskTitle: 1, taskPage: 1 }, { unique: true, sparse: true });
TaskConversationSchema.index({ selectionId: 1, taskTitle: 1 }, { unique: true, partialFilterExpression: { taskPage: { $exists: false } } });
exports.default = mongoose_1.default.model('TaskConversation', TaskConversationSchema);
//# sourceMappingURL=TaskConversation.js.map