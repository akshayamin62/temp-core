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
exports.LEAD_STAGE = exports.SERVICE_TYPE = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var SERVICE_TYPE;
(function (SERVICE_TYPE) {
    SERVICE_TYPE["EDUCATION_PLANNING"] = "Education Planning";
    SERVICE_TYPE["CARRER_FOCUS_STUDY_ABROAD"] = "Carrer Focus Study Abroad ";
    SERVICE_TYPE["IVY_LEAGUE_ADMISSION"] = "Ivy League Admission";
    SERVICE_TYPE["IELTS_GRE_LANGUAGE_COACHING"] = "IELTS/GRE/Language Coaching";
})(SERVICE_TYPE || (exports.SERVICE_TYPE = SERVICE_TYPE = {}));
var LEAD_STAGE;
(function (LEAD_STAGE) {
    LEAD_STAGE["NEW"] = "New";
    LEAD_STAGE["HOT"] = "Hot";
    LEAD_STAGE["WARM"] = "Warm";
    LEAD_STAGE["COLD"] = "Cold";
    LEAD_STAGE["CONVERTED"] = "Converted to Student";
    LEAD_STAGE["CLOSED"] = "Closed";
})(LEAD_STAGE || (exports.LEAD_STAGE = LEAD_STAGE = {}));
const leadSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        trim: true,
        required: true,
    },
    serviceTypes: {
        type: [String],
        enum: Object.values(SERVICE_TYPE),
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: "At least one service type is required",
        },
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    assignedCounselorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Counselor",
        default: null,
    },
    stage: {
        type: String,
        enum: Object.values(LEAD_STAGE),
        default: LEAD_STAGE.NEW,
    },
    source: {
        type: String,
        default: "Enquiry Form",
    },
    conversionRequestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "LeadStudentConversion",
        default: null,
    },
    conversionStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: null,
    },
}, { timestamps: true });
// Index for faster queries
leadSchema.index({ adminId: 1, stage: 1 });
leadSchema.index({ assignedCounselorId: 1, stage: 1 });
leadSchema.index({ email: 1, adminId: 1 });
exports.default = mongoose_1.default.model("Lead", leadSchema);
//# sourceMappingURL=Lead.js.map