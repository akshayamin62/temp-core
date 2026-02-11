"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStudentId = exports.resolveIvyExpertId = void 0;
const IvyExpert_1 = __importDefault(require("../models/IvyExpert"));
const Student_1 = __importDefault(require("../models/Student"));
/**
 * Resolve IvyExpert._id from a User._id.
 * Used across all ivy controllers to map the authenticated user
 * to their IvyExpert document (since activeIvyExpertId stores IvyExpert._id).
 */
const resolveIvyExpertId = async (userId) => {
    const expert = await IvyExpert_1.default.findOne({ userId });
    if (!expert) {
        throw new Error('IvyExpert record not found for this user');
    }
    return expert._id.toString();
};
exports.resolveIvyExpertId = resolveIvyExpertId;
/**
 * Resolve Student._id from a User._id.
 */
const resolveStudentId = async (userId) => {
    const student = await Student_1.default.findOne({ userId });
    if (!student) {
        throw new Error('Student record not found for this user');
    }
    return student._id.toString();
};
exports.resolveStudentId = resolveStudentId;
//# sourceMappingURL=resolveRole.js.map