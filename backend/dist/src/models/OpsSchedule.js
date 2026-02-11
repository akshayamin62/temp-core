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
exports.OPS_SCHEDULE_STATUS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OPS_SCHEDULE_STATUS;
(function (OPS_SCHEDULE_STATUS) {
    OPS_SCHEDULE_STATUS["SCHEDULED"] = "SCHEDULED";
    OPS_SCHEDULE_STATUS["COMPLETED"] = "COMPLETED";
    OPS_SCHEDULE_STATUS["MISSED"] = "MISSED";
})(OPS_SCHEDULE_STATUS || (exports.OPS_SCHEDULE_STATUS = OPS_SCHEDULE_STATUS = {}));
const opsScheduleSchema = new mongoose_1.Schema({
    opsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ops",
        required: true,
    },
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Student",
        required: false, // Optional - null means task is for OPS themselves
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
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: "Time must be in HH:mm format",
        },
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(OPS_SCHEDULE_STATUS),
        default: OPS_SCHEDULE_STATUS.SCHEDULED,
    },
    completedAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes for performance
opsScheduleSchema.index({ opsId: 1, scheduledDate: 1 });
opsScheduleSchema.index({ studentId: 1, scheduledDate: 1 });
opsScheduleSchema.index({ status: 1 });
exports.default = mongoose_1.default.model("OpsSchedule", opsScheduleSchema);
//# sourceMappingURL=OpsSchedule.js.map