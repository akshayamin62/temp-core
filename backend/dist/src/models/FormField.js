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
exports.FieldType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var FieldType;
(function (FieldType) {
    FieldType["TEXT"] = "TEXT";
    FieldType["EMAIL"] = "EMAIL";
    FieldType["NUMBER"] = "NUMBER";
    FieldType["DATE"] = "DATE";
    FieldType["PHONE"] = "PHONE";
    FieldType["TEXTAREA"] = "TEXTAREA";
    FieldType["SELECT"] = "SELECT";
    FieldType["RADIO"] = "RADIO";
    FieldType["CHECKBOX"] = "CHECKBOX";
    FieldType["FILE"] = "FILE";
    FieldType["COUNTRY"] = "COUNTRY";
    FieldType["STATE"] = "STATE";
    FieldType["CITY"] = "CITY";
})(FieldType || (exports.FieldType = FieldType = {}));
const formFieldSchema = new mongoose_1.Schema({
    subSectionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "FormSubSection",
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    key: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(FieldType),
        required: true,
    },
    placeholder: {
        type: String,
        default: undefined,
    },
    helpText: {
        type: String,
        default: undefined,
    },
    required: {
        type: Boolean,
        default: false,
    },
    order: {
        type: Number,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    validation: {
        type: {
            min: Number,
            max: Number,
            pattern: String,
            message: String,
        },
        default: undefined,
    },
    options: {
        type: [
            {
                label: String,
                value: String,
            },
        ],
        default: undefined,
    },
    defaultValue: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
}, { timestamps: true });
// Index for efficient querying
formFieldSchema.index({ subSectionId: 1, order: 1 });
exports.default = mongoose_1.default.model("FormField", formFieldSchema);
//# sourceMappingURL=FormField.js.map