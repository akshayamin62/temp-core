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
const ProgramChatSchema = new mongoose_1.Schema({
    programId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Program',
        required: true,
    },
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    chatType: {
        type: String,
        enum: ['open', 'private'],
        default: 'open',
        required: true,
    },
    participants: {
        student: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        OPS: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
        superAdmin: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
        admin: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
        counselor: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
}, {
    timestamps: true,
});
// Compound index to ensure one chat per program-student-chatType combination
ProgramChatSchema.index({ programId: 1, studentId: 1, chatType: 1 }, { unique: true });
const ProgramChat = mongoose_1.default.model('ProgramChat', ProgramChatSchema);
// Drop stale 2-field index if it exists (was replaced by 3-field index including chatType)
ProgramChat.collection.dropIndex('programId_1_studentId_1').catch(() => {
    // Index doesn't exist or already dropped — safe to ignore
});
exports.default = ProgramChat;
//# sourceMappingURL=ProgramChat.js.map