import { Response } from "express";
import Student from "../models/Student";
import { AuthRequest } from "../types/auth";

// Get student profile
export const getStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    let student = await Student.findOne({ userId }).populate("userId");

    // If student profile doesn't exist, create a basic one
    if (!student) {
      const user = await Student.findOne({ userId }).populate("userId");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Create basic student profile
      student = await Student.create({
        userId,
        mobileNumber: "",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student profile fetched successfully",
      data: { student },
    });
  } catch (error: any) {
    console.error("Get student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student profile",
      error: error.message,
    });
  }
};

// Update student profile
export const updateStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const updateData = req.body;

    // Remove userId from update data if it exists (shouldn't be updated)
    delete updateData.userId;

    let student = await Student.findOne({ userId });

    if (!student) {
      // Create new student profile
      student = await Student.create({
        userId,
        ...updateData,
      });
    } else {
      // Update existing profile
      Object.assign(student, updateData);
      await student.save();
    }

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully",
      data: { student },
    });
  } catch (error: any) {
    console.error("Update student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student profile",
      error: error.message,
    });
  }
};

// Delete student profile (soft delete - keep user account)
export const deleteStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const student = await Student.findOneAndDelete({ userId });

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
  } catch (error: any) {
    console.error("Delete student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete student profile",
      error: error.message,
    });
  }
};


