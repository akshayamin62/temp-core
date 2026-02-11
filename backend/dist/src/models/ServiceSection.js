"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceSection = void 0;
const mongoose_1 = require("mongoose");
const serviceSectionSchema = new mongoose_1.Schema({
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
    order: {
        type: Number,
        required: true,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Composite unique index: A section can only be added once to a service
serviceSectionSchema.index({ service: 1, section: 1 }, { unique: true });
serviceSectionSchema.index({ service: 1, order: 1 });
exports.ServiceSection = (0, mongoose_1.model)('ServiceSection', serviceSectionSchema);
//# sourceMappingURL=ServiceSection.js.map