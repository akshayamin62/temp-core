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
exports.ServiceRegistrationStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ServiceRegistrationStatus;
(function (ServiceRegistrationStatus) {
    ServiceRegistrationStatus["REGISTERED"] = "REGISTERED";
    ServiceRegistrationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ServiceRegistrationStatus["COMPLETED"] = "COMPLETED";
    ServiceRegistrationStatus["CANCELLED"] = "CANCELLED";
})(ServiceRegistrationStatus || (exports.ServiceRegistrationStatus = ServiceRegistrationStatus = {}));
const studentServiceRegistrationSchema = new mongoose_1.Schema({
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    serviceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    // For Study Abroad service - OPS role
    primaryOpsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ops",
        required: false,
    },
    secondaryOpsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ops",
        required: false,
    },
    activeOpsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ops",
        required: false,
    },
    // For Ivy League service - IVY_EXPERT role
    primaryIvyExpertId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IvyExpert",
        required: false,
    },
    secondaryIvyExpertId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IvyExpert",
        required: false,
    },
    activeIvyExpertId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "IvyExpert",
        required: false,
    },
    // For Education Planning service - EDUPLAN_COACH role
    primaryEduplanCoachId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "EduplanCoach",
        required: false,
    },
    secondaryEduplanCoachId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "EduplanCoach",
        required: false,
    },
    activeEduplanCoachId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "EduplanCoach",
        required: false,
    },
    // Ivy League scoring
    overallScore: {
        type: Number,
        default: undefined,
    },
    studentInterest: {
        type: String,
        default: undefined,
    },
    status: {
        type: String,
        enum: Object.values(ServiceRegistrationStatus),
        default: ServiceRegistrationStatus.REGISTERED,
    },
    registeredAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: undefined,
    },
    cancelledAt: {
        type: Date,
        default: undefined,
    },
    paymentStatus: {
        type: String,
        default: undefined,
    },
    paymentAmount: {
        type: Number,
        default: undefined,
    },
    notes: {
        type: String,
        default: undefined,
    },
}, { timestamps: true });
// Compound index to ensure a student can only register once per service
studentServiceRegistrationSchema.index({ studentId: 1, serviceId: 1 }, { unique: true });
exports.default = mongoose_1.default.model("StudentServiceRegistration", studentServiceRegistrationSchema);
//# sourceMappingURL=StudentServiceRegistration.js.map