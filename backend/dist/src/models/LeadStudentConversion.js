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
exports.CONVERSION_STATUS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CONVERSION_STATUS;
(function (CONVERSION_STATUS) {
    CONVERSION_STATUS["PENDING"] = "PENDING";
    CONVERSION_STATUS["APPROVED"] = "APPROVED";
    CONVERSION_STATUS["REJECTED"] = "REJECTED";
})(CONVERSION_STATUS || (exports.CONVERSION_STATUS = CONVERSION_STATUS = {}));
const LeadStudentConversionSchema = new mongoose_1.Schema({
    leadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    requestedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(CONVERSION_STATUS),
        default: CONVERSION_STATUS.PENDING
    },
    rejectionReason: {
        type: String
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    createdStudentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Student'
    }
}, {
    timestamps: true
});
// Index for efficient queries
LeadStudentConversionSchema.index({ adminId: 1, status: 1 });
LeadStudentConversionSchema.index({ leadId: 1 });
LeadStudentConversionSchema.index({ requestedBy: 1 });
exports.default = mongoose_1.default.model('LeadStudentConversion', LeadStudentConversionSchema);
//# sourceMappingURL=LeadStudentConversion.js.map