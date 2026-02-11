"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditRequest = exports.ApprovedByRole = exports.RequestedByRole = exports.EditRequestStatus = void 0;
const mongoose_1 = require("mongoose");
var EditRequestStatus;
(function (EditRequestStatus) {
    EditRequestStatus["PENDING"] = "pending";
    EditRequestStatus["APPROVED"] = "approved";
    EditRequestStatus["REJECTED"] = "rejected";
})(EditRequestStatus || (exports.EditRequestStatus = EditRequestStatus = {}));
var RequestedByRole;
(function (RequestedByRole) {
    RequestedByRole["STUDENT"] = "STUDENT";
    RequestedByRole["COUNSELOR"] = "COUNSELOR";
})(RequestedByRole || (exports.RequestedByRole = RequestedByRole = {}));
var ApprovedByRole;
(function (ApprovedByRole) {
    ApprovedByRole["COUNSELOR"] = "COUNSELOR";
    ApprovedByRole["ADMIN"] = "ADMIN";
})(ApprovedByRole || (exports.ApprovedByRole = ApprovedByRole = {}));
const editRequestSchema = new mongoose_1.Schema({
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
    section: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'FormSection',
        required: true,
    },
    sectionInstanceId: {
        type: String,
        required: true,
    },
    question: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
    },
    currentValue: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    requestedValue: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    requestedBy: {
        type: String,
        enum: Object.values(RequestedByRole),
        required: true,
    },
    requestedByUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(EditRequestStatus),
        default: EditRequestStatus.PENDING,
    },
    approvedBy: {
        type: String,
        enum: Object.values(ApprovedByRole),
    },
    approvedByUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    reason: {
        type: String,
        trim: true,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    resolvedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Indexes for queries
editRequestSchema.index({ student: 1 });
editRequestSchema.index({ service: 1 });
editRequestSchema.index({ status: 1 });
editRequestSchema.index({ approvedByUser: 1 });
editRequestSchema.index({ requestedByUser: 1 });
// Auto-update resolvedAt when status changes
editRequestSchema.pre('save', function (next) {
    if (this.isModified('status') &&
        (this.status === EditRequestStatus.APPROVED || this.status === EditRequestStatus.REJECTED) &&
        !this.resolvedAt) {
        this.resolvedAt = new Date();
    }
    next();
});
exports.EditRequest = (0, mongoose_1.model)('EditRequest', editRequestSchema);
//# sourceMappingURL=EditRequest.js.map