import { Request, Response } from "express";
import Student from "../models/Student";
import User from "../models/User";
import IvyLeagueRegistration from "../models/IvyLeagueRegistration";
import Advisor from "../models/Advisor";
import { AuthRequest } from "../types/auth";

// GET /prefill - Get student name pre-filled from database
export const getStudentPrefill = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    // Check if already registered for ivy league
    const existingRegistration = await IvyLeagueRegistration.findOne({ studentId: student._id });

    // Check advisor allowedServices for ivy-league
    let advisorBlocked = false;
    if (student.advisorId) {
      const advisor = await Advisor.findById(student.advisorId);
      if (advisor && !advisor.allowedServices.includes('ivy-league')) {
        advisorBlocked = true;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || student.email || "",
        mobile: student.mobileNumber || "",
        alreadyRegistered: !!existingRegistration,
        advisorBlocked,
      },
    });
  } catch (error: any) {
    console.error("Get student prefill error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student details",
    });
  }
};

// POST / - Submit ivy league registration form
export const submitIvyLeagueRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    // Check advisor allowedServices for ivy-league
    if (student.advisorId) {
      const advisor = await Advisor.findById(student.advisorId);
      if (advisor && !advisor.allowedServices.includes('ivy-league')) {
        return res.status(403).json({
          success: false,
          message: "Ivy League service is not available through your advisor. Please contact your advisor for more information.",
        });
      }
    }

    // Check if already registered
    const existingRegistration = await IvyLeagueRegistration.findOne({ studentId: student._id });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an Ivy League registration",
      });
    }

    const {
      firstName,
      middleName,
      lastName,
      parentFirstName,
      parentMiddleName,
      parentLastName,
      parentMobile,
      parentEmail,
      schoolName,
      curriculum,
      currentGrade,
    } = req.body;

    const registration = await IvyLeagueRegistration.create({
      studentId: student._id,
      userId,
      firstName,
      middleName: middleName || undefined,
      lastName,
      parentFirstName,
      parentMiddleName: parentMiddleName || undefined,
      parentLastName,
      parentMobile,
      parentEmail,
      schoolName,
      curriculum,
      currentGrade,
    });

    return res.status(201).json({
      success: true,
      message: "Ivy League registration submitted successfully",
      data: { registration },
    });
  } catch (error: any) {
    console.error("Submit ivy league registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an Ivy League registration",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to submit registration",
    });
  }
};

// GET /status - Check if student has already registered for ivy league
export const getRegistrationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found" });
    }

    const registration = await IvyLeagueRegistration.findOne({ studentId: student._id });

    return res.status(200).json({
      success: true,
      data: {
        registered: !!registration,
        registration: registration || null,
      },
    });
  } catch (error: any) {
    console.error("Get registration status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check registration status",
    });
  }
};
