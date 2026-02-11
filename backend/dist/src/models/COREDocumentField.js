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
exports.COREDocumentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Document type enum for differentiating between CORE and EXTRA documents
var COREDocumentType;
(function (COREDocumentType) {
    COREDocumentType["CORE"] = "CORE";
    COREDocumentType["EXTRA"] = "EXTRA";
})(COREDocumentType || (exports.COREDocumentType = COREDocumentType = {}));
const coreDocumentFieldSchema = new mongoose_1.Schema({
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true,
    },
    registrationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "StudentServiceRegistration",
        required: true,
        index: true,
    },
    documentName: {
        type: String,
        required: true,
    },
    documentKey: {
        type: String,
        required: true,
    },
    documentType: {
        type: String,
        enum: Object.values(COREDocumentType),
        required: true,
        default: COREDocumentType.CORE,
        index: true,
    },
    category: {
        type: String,
        enum: ["PRIMARY", "SECONDARY"],
        default: "SECONDARY",
    },
    required: {
        type: Boolean,
        default: false,
    },
    helpText: {
        type: String,
    },
    allowMultiple: {
        type: Boolean,
        default: false,
    },
    order: {
        type: Number,
        default: 1,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdByRole: {
        type: String,
        enum: ["SUPER_ADMIN", "OPS"],
        required: true,
    },
}, {
    timestamps: true,
});
// Compound index for student + registration + documentKey + documentType uniqueness
coreDocumentFieldSchema.index({ studentId: 1, registrationId: 1, documentKey: 1, documentType: 1 }, { unique: true });
exports.default = mongoose_1.default.model("COREDocumentField", coreDocumentFieldSchema);
//# sourceMappingURL=COREDocumentField.js.map