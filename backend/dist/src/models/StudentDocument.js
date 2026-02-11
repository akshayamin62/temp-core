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
exports.UploaderRole = exports.DocumentStatus = exports.DocumentCategory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var DocumentCategory;
(function (DocumentCategory) {
    DocumentCategory["PRIMARY"] = "PRIMARY";
    DocumentCategory["SECONDARY"] = "SECONDARY";
})(DocumentCategory || (exports.DocumentCategory = DocumentCategory = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "PENDING";
    DocumentStatus["APPROVED"] = "APPROVED";
    DocumentStatus["REJECTED"] = "REJECTED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var UploaderRole;
(function (UploaderRole) {
    UploaderRole["STUDENT"] = "STUDENT";
    UploaderRole["OPS"] = "OPS";
    UploaderRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UploaderRole || (exports.UploaderRole = UploaderRole = {}));
const studentDocumentSchema = new mongoose_1.Schema({
    registrationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "StudentServiceRegistration",
        required: true,
        index: true,
    },
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true,
    },
    documentCategory: {
        type: String,
        enum: Object.values(DocumentCategory),
        required: true,
    },
    documentName: {
        type: String,
        required: true,
    },
    documentKey: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    uploadedByRole: {
        type: String,
        enum: Object.values(UploaderRole),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(DocumentStatus),
        default: DocumentStatus.PENDING,
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    approvedAt: {
        type: Date,
    },
    rejectedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    rejectedAt: {
        type: Date,
    },
    rejectionMessage: {
        type: String,
    },
    version: {
        type: Number,
        default: 1,
    },
    isCustomField: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Compound index for efficient queries
studentDocumentSchema.index({ registrationId: 1, documentKey: 1 });
studentDocumentSchema.index({ studentId: 1, status: 1 });
const StudentDocument = mongoose_1.default.model("StudentDocument", studentDocumentSchema);
exports.default = StudentDocument;
//# sourceMappingURL=StudentDocument.js.map