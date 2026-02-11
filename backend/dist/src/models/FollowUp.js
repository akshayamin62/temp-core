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
exports.MEETING_TYPE = exports.FOLLOWUP_STATUS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Lead_1 = require("./Lead");
var FOLLOWUP_STATUS;
(function (FOLLOWUP_STATUS) {
    FOLLOWUP_STATUS["SCHEDULED"] = "Scheduled";
    FOLLOWUP_STATUS["CALL_NOT_ANSWERED"] = "Call Not Answered";
    FOLLOWUP_STATUS["PHONE_SWITCHED_OFF"] = "Phone Switched Off";
    FOLLOWUP_STATUS["OUT_OF_COVERAGE"] = "Out of Coverage Area";
    FOLLOWUP_STATUS["NUMBER_BUSY"] = "Number Busy";
    FOLLOWUP_STATUS["CALL_DISCONNECTED"] = "Call Disconnected";
    FOLLOWUP_STATUS["INVALID_NUMBER"] = "Invalid / Wrong Number";
    FOLLOWUP_STATUS["INCOMING_BARRED"] = "Incoming Calls Barred";
    FOLLOWUP_STATUS["CALL_REJECTED"] = "Call Rejected / Declined";
    FOLLOWUP_STATUS["CALL_BACK_LATER"] = "Asked to Call Back Later";
    FOLLOWUP_STATUS["BUSY_RESCHEDULE"] = "Busy - Requested Reschedule";
    FOLLOWUP_STATUS["DISCUSS_WITH_PARENTS"] = "Need time to discuss with parents";
    FOLLOWUP_STATUS["RESPONDING_VAGUELY"] = "Responding Vaguely / Non-committal";
    FOLLOWUP_STATUS["INTERESTED_NEED_TIME"] = "Interested - Need Time";
    FOLLOWUP_STATUS["INTERESTED_DISCUSSING"] = "Interested - Discussing with Family";
    FOLLOWUP_STATUS["NOT_INTERESTED"] = "Not Interested (Explicit)";
    FOLLOWUP_STATUS["NOT_REQUIRED"] = "Not Required Anymore";
    FOLLOWUP_STATUS["REPEATEDLY_NOT_RESPONDING"] = "Repeatedly Not Responding";
    FOLLOWUP_STATUS["FAKE_ENQUIRY"] = "Fake / Test Enquiry";
    FOLLOWUP_STATUS["DUPLICATE_ENQUIRY"] = "Duplicate Enquiry";
    FOLLOWUP_STATUS["CONVERTED_TO_STUDENT"] = "Converted to Student";
})(FOLLOWUP_STATUS || (exports.FOLLOWUP_STATUS = FOLLOWUP_STATUS = {}));
var MEETING_TYPE;
(function (MEETING_TYPE) {
    MEETING_TYPE["ONLINE"] = "Online";
    MEETING_TYPE["FACE_TO_FACE"] = "Face to Face";
})(MEETING_TYPE || (exports.MEETING_TYPE = MEETING_TYPE = {}));
const followUpSchema = new mongoose_1.Schema({
    leadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
    },
    counselorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Counselor",
        required: true,
    },
    scheduledDate: {
        type: Date,
        required: true,
    },
    scheduledTime: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: "Time must be in HH:mm format",
        },
    },
    duration: {
        type: Number,
        required: true,
        enum: [15, 30, 45, 60],
        default: 30,
    },
    meetingType: {
        type: String,
        enum: Object.values(MEETING_TYPE),
        required: true,
        default: MEETING_TYPE.ONLINE,
    },
    zohoMeetingKey: {
        type: String,
        default: null,
    },
    zohoMeetingUrl: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: Object.values(FOLLOWUP_STATUS),
        default: FOLLOWUP_STATUS.SCHEDULED,
    },
    stageAtFollowUp: {
        type: String,
        enum: Object.values(Lead_1.LEAD_STAGE),
        required: true,
    },
    stageChangedTo: {
        type: String,
        enum: Object.values(Lead_1.LEAD_STAGE),
        default: null,
    },
    followUpNumber: {
        type: Number,
        required: true,
        default: 1,
    },
    notes: {
        type: String,
        default: "",
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
// Index for faster queries
followUpSchema.index({ leadId: 1, status: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1, scheduledTime: 1 });
followUpSchema.index({ status: 1, scheduledDate: 1 });
exports.default = mongoose_1.default.model("FollowUp", followUpSchema);
//# sourceMappingURL=FollowUp.js.map