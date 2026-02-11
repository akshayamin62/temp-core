"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudentProfile = exports.updateStudentProfile = exports.getStudentProfile = void 0;
const Student_1 = __importDefault(require("../models/Student"));
// Get student profile
const getStudentProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        let student = await Student_1.default.findOne({ userId }).populate("userId");
        // If student profile doesn't exist, create a basic one
        if (!student) {
            const user = await Student_1.default.findOne({ userId }).populate("userId");
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Create basic student profile
            student = await Student_1.default.create({
                userId,
                mobileNumber: "",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Student profile fetched successfully",
            data: { student },
        });
    }
    catch (error) {
        console.error("Get student profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student profile",
            error: error.message,
        });
    }
};
exports.getStudentProfile = getStudentProfile;
// Update student profile
const updateStudentProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const updateData = req.body;
        // Remove userId from update data if it exists (shouldn't be updated)
        delete updateData.userId;
        let student = await Student_1.default.findOne({ userId });
        if (!student) {
            // Create new student profile
            student = await Student_1.default.create({
                userId,
                ...updateData,
            });
        }
        else {
            // Update existing profile
            Object.assign(student, updateData);
            await student.save();
        }
        return res.status(200).json({
            success: true,
            message: "Student profile updated successfully",
            data: { student },
        });
    }
    catch (error) {
        console.error("Update student profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update student profile",
            error: error.message,
        });
    }
};
exports.updateStudentProfile = updateStudentProfile;
// Delete student profile (soft delete - keep user account)
const deleteStudentProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const student = await Student_1.default.findOneAndDelete({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Student profile deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete student profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete student profile",
            error: error.message,
        });
    }
};
exports.deleteStudentProfile = deleteStudentProfile;
//# sourceMappingURL=studentController.js.map