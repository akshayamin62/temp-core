"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentInterest = exports.getStudentInterest = void 0;
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const getStudentInterest = async (studentIvyServiceId) => {
    const service = await StudentServiceRegistration_1.default.findById(studentIvyServiceId);
    if (!service) {
        throw new Error('Student service registration not found');
    }
    return service;
};
exports.getStudentInterest = getStudentInterest;
/**
 * Update student interest - stores as plain text with overwrite allowed
 * No validation logic applied to studentInterest content
 */
const updateStudentInterest = async (studentIvyServiceId, studentInterest) => {
    // Direct update - no validation, overwrite allowed
    const updatedService = await StudentServiceRegistration_1.default.findByIdAndUpdate(studentIvyServiceId, { studentInterest }, { new: true, runValidators: false });
    if (!updatedService) {
        throw new Error('Student service registration not found');
    }
    return updatedService;
};
exports.updateStudentInterest = updateStudentInterest;
//# sourceMappingURL=studentInterest.service.js.map