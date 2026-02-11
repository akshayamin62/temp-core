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
exports.TEAMMEET_TYPE = exports.TEAMMEET_STATUS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// TeamMeet Status Enum
var TEAMMEET_STATUS;
(function (TEAMMEET_STATUS) {
    TEAMMEET_STATUS["PENDING_CONFIRMATION"] = "PENDING_CONFIRMATION";
    TEAMMEET_STATUS["CONFIRMED"] = "CONFIRMED";
    TEAMMEET_STATUS["REJECTED"] = "REJECTED";
    TEAMMEET_STATUS["CANCELLED"] = "CANCELLED";
    TEAMMEET_STATUS["COMPLETED"] = "COMPLETED";
})(TEAMMEET_STATUS || (exports.TEAMMEET_STATUS = TEAMMEET_STATUS = {}));
// TeamMeet Type Enum
var TEAMMEET_TYPE;
(function (TEAMMEET_TYPE) {
    TEAMMEET_TYPE["ONLINE"] = "ONLINE";
    TEAMMEET_TYPE["FACE_TO_FACE"] = "FACE_TO_FACE";
})(TEAMMEET_TYPE || (exports.TEAMMEET_TYPE = TEAMMEET_TYPE = {}));
const teamMeetSchema = new mongoose_1.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    scheduledDate: {
        type: Date,
        required: true,
    },
    scheduledTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
    },
    duration: {
        type: Number,
        required: true,
        enum: [15, 30, 45, 60],
        default: 30,
    },
    meetingType: {
        type: String,
        required: true,
        enum: Object.values(TEAMMEET_TYPE),
        default: TEAMMEET_TYPE.ONLINE,
    },
    zohoMeetingKey: {
        type: String,
        default: null,
    },
    zohoMeetingUrl: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    requestedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requestedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(TEAMMEET_STATUS),
        default: TEAMMEET_STATUS.PENDING_CONFIRMATION,
    },
    rejectionMessage: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    completedAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes for efficient queries
teamMeetSchema.index({ requestedBy: 1, scheduledDate: 1 });
teamMeetSchema.index({ requestedTo: 1, scheduledDate: 1 });
teamMeetSchema.index({ adminId: 1 });
teamMeetSchema.index({ status: 1 });
teamMeetSchema.index({ scheduledDate: 1, scheduledTime: 1 });
exports.default = mongoose_1.default.model("TeamMeet", teamMeetSchema);
//# sourceMappingURL=TeamMeet.js.map