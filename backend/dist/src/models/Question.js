"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Question = exports.EditPolicy = exports.QuestionType = void 0;
const mongoose_1 = require("mongoose");
var QuestionType;
(function (QuestionType) {
    QuestionType["TEXT"] = "text";
    QuestionType["NUMBER"] = "number";
    QuestionType["DATE"] = "date";
    QuestionType["SELECT"] = "select";
    QuestionType["MULTISELECT"] = "multiselect";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var EditPolicy;
(function (EditPolicy) {
    EditPolicy["STUDENT"] = "STUDENT";
    EditPolicy["COUNSELOR"] = "COUNSELOR";
    EditPolicy["ADMIN"] = "ADMIN";
})(EditPolicy || (exports.EditPolicy = EditPolicy = {}));
const questionSchema = new mongoose_1.Schema({
    label: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: Object.values(QuestionType),
        required: true,
    },
    options: [{
            type: String,
            trim: true,
        }],
    editPolicy: {
        type: String,
        enum: Object.values(EditPolicy),
        default: EditPolicy.STUDENT,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Validation: options required for select/multiselect
questionSchema.pre('save', function (next) {
    if ((this.type === QuestionType.SELECT || this.type === QuestionType.MULTISELECT) &&
        (!this.options || this.options.length === 0)) {
        next(new Error('Options are required for select/multiselect question types'));
    }
    next();
});
// Index for active questions
questionSchema.index({ isActive: 1 });
exports.Question = (0, mongoose_1.model)('Question', questionSchema);
//# sourceMappingURL=Question.js.map