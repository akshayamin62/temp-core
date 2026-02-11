"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enrollment = exports.EnrollmentStatus = void 0;
const mongoose_1 = require("mongoose");
var EnrollmentStatus;
(function (EnrollmentStatus) {
    EnrollmentStatus["NOT_STARTED"] = "not_started";
    EnrollmentStatus["IN_PROGRESS"] = "in_progress";
    EnrollmentStatus["SUBMITTED"] = "submitted";
    EnrollmentStatus["COMPLETED"] = "completed";
})(EnrollmentStatus || (exports.EnrollmentStatus = EnrollmentStatus = {}));
const enrollmentSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
    },
    assignedCounselor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Counselor',
    },
    status: {
        type: String,
        enum: Object.values(EnrollmentStatus),
        default: EnrollmentStatus.NOT_STARTED,
    },
    startedAt: {
        type: Date,
    },
    submittedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Composite unique index: A student can only enroll once per service
enrollmentSchema.index({ student: 1, service: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ service: 1 });
enrollmentSchema.index({ assignedCounselor: 1 });
enrollmentSchema.index({ status: 1 });
// Auto-update timestamps based on status changes
enrollmentSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        const now = new Date();
        if (this.status === EnrollmentStatus.IN_PROGRESS && !this.startedAt) {
            this.startedAt = now;
        }
        else if (this.status === EnrollmentStatus.SUBMITTED && !this.submittedAt) {
            this.submittedAt = now;
        }
        else if (this.status === EnrollmentStatus.COMPLETED && !this.completedAt) {
            this.completedAt = now;
        }
    }
    next();
});
exports.Enrollment = (0, mongoose_1.model)('Enrollment', enrollmentSchema);
//# sourceMappingURL=Enrollment.js.map