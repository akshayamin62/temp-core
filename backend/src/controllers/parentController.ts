import { Response } from "express";
import { AuthRequest } from "../types/auth";
import Parent from "../models/Parent";
import User from "../models/User";
import Student from "../models/Student";
import Lead from "../models/Lead";
import StudentFormAnswer from "../models/StudentFormAnswer";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
import Ops from "../models/Ops";
import EduplanCoach from "../models/EduplanCoach";
import IvyExpert from "../models/IvyExpert";
import { USER_ROLE } from "../types/roles";
import { generateOTP } from "../utils/otp";
import mongoose from "mongoose";

/**
 * Get parents that belong to the logged-in user based on their role.
 * ADMIN → parents of admin's students
 * COUNSELOR → parents of counselor's students
 * OPS → parents of students in registrations where this ops is assigned
 * EDUPLAN_COACH → parents of students in registrations where this coach is assigned
 * IVY_EXPERT → parents of students in registrations where this expert is assigned
 * STUDENT → parents linked to this student
 */
export const getMyParents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let studentIds: mongoose.Types.ObjectId[] = [];

    if (userRole === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId });
      if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
      const students = await Student.find({ adminId: admin._id }).select("_id");
      studentIds = students.map((s) => s._id as mongoose.Types.ObjectId);
    } else if (userRole === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) return res.status(404).json({ success: false, message: "Counselor not found" });
      const students = await Student.find({ counselorId: counselor._id }).select("_id");
      studentIds = students.map((s) => s._id as mongoose.Types.ObjectId);
    } else if (userRole === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });
      if (!ops) return res.status(404).json({ success: false, message: "Ops not found" });
      const regs = await StudentServiceRegistration.find({
        $or: [{ primaryOpsId: ops._id }, { secondaryOpsId: ops._id }, { activeOpsId: ops._id }],
      }).select("studentId");
      studentIds = regs.map((r) => r.studentId as mongoose.Types.ObjectId);
    } else if (userRole === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId });
      if (!coach) return res.status(404).json({ success: false, message: "EduplanCoach not found" });
      const regs = await StudentServiceRegistration.find({
        $or: [
          { activeEduplanCoachId: coach._id },
          { primaryEduplanCoachId: coach._id },
          { secondaryEduplanCoachId: coach._id },
        ],
      }).select("studentId");
      studentIds = regs.map((r) => r.studentId as mongoose.Types.ObjectId);
    } else if (userRole === USER_ROLE.IVY_EXPERT) {
      const expert = await IvyExpert.findOne({ userId });
      if (!expert) return res.status(404).json({ success: false, message: "IvyExpert not found" });
      const regs = await StudentServiceRegistration.find({
        $or: [
          { activeIvyExpertId: expert._id },
          { primaryIvyExpertId: expert._id },
          { secondaryIvyExpertId: expert._id },
        ],
      }).select("studentId");
      studentIds = regs.map((r) => r.studentId as mongoose.Types.ObjectId);
    } else if (userRole === USER_ROLE.STUDENT) {
      const student = await Student.findOne({ userId }).select("_id");
      if (!student) return res.status(404).json({ success: false, message: "Student not found" });
      studentIds = [student._id as mongoose.Types.ObjectId];
    } else {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Deduplicate
    const uniqueIds = [...new Set(studentIds.map((id) => id.toString()))];

    // Find parents linked to these students
    const parents = await Parent.find({ studentIds: { $in: uniqueIds } })
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt")
      .populate({
        path: "studentIds",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .lean();

    return res.status(200).json({ success: true, data: { parents } });
  } catch (error: any) {
    console.error("Get my parents error:", error);
    return res.status(500).json({ success: false, message: "Failed to get parents" });
  }
};

/**
 * Get a single parent detail by parentId
 */
export const getParentDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { parentId } = req.params;

    const parent = await Parent.findById(parentId)
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt")
      .populate({
        path: "studentIds",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .lean();

    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    return res.status(200).json({ success: true, data: { parent } });
  } catch (error: any) {
    console.error("Get parent detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to get parent detail" });
  }
};

/**
 * Get parents for a given student
 */
export const getParentsByStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const parents = await Parent.find({ studentIds: studentId })
      .populate("userId", "firstName middleName lastName email")
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      data: { parents },
    });
  } catch (error: any) {
    console.error("Get parents error:", error);
    return res.status(500).json({ success: false, message: "Failed to get parents" });
  }
};

/**
 * Update parent info (joint edit across User, Parent, Lead, StudentFormAnswer)
 * Allowed roles: OPS, IVY_EXPERT, EDUPLAN_COACH, SUPER_ADMIN
 */
export const updateParentInfo = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { parentId } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      relationship,
      mobileNumber,
      email,
      qualification,
      occupation,
    } = req.body;

    // Find parent doc
    const parentDoc = await Parent.findById(parentId);
    if (!parentDoc) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    // Update User model
    const userUpdate: any = {};
    if (firstName !== undefined) userUpdate.firstName = firstName.trim();
    if (middleName !== undefined) userUpdate.middleName = middleName.trim();
    if (lastName !== undefined) userUpdate.lastName = lastName.trim();
    if (email !== undefined) userUpdate.email = email.trim().toLowerCase();

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(parentDoc.userId, { $set: userUpdate });
    }

    // Update Parent model
    if (email !== undefined) parentDoc.email = email.trim().toLowerCase();
    if (relationship !== undefined) parentDoc.relationship = relationship.trim();
    if (mobileNumber !== undefined) parentDoc.mobileNumber = mobileNumber.trim();
    if (qualification !== undefined) parentDoc.qualification = qualification.trim();
    if (occupation !== undefined) parentDoc.occupation = occupation.trim();
    await parentDoc.save();

    // Update Lead if present
    if (parentDoc.convertedFromLeadId) {
      const leadUpdate: any = {};
      if (firstName !== undefined) leadUpdate["parentDetail.firstName"] = firstName.trim();
      if (middleName !== undefined) leadUpdate["parentDetail.middleName"] = (middleName || "").trim();
      if (lastName !== undefined) leadUpdate["parentDetail.lastName"] = lastName.trim();
      if (relationship !== undefined) leadUpdate["parentDetail.relationship"] = relationship.trim();
      if (mobileNumber !== undefined) leadUpdate["parentDetail.mobileNumber"] = mobileNumber.trim();
      if (email !== undefined) leadUpdate["parentDetail.email"] = email.trim().toLowerCase();
      if (qualification !== undefined) leadUpdate["parentDetail.qualification"] = qualification.trim();
      if (occupation !== undefined) leadUpdate["parentDetail.occupation"] = occupation.trim();

      if (Object.keys(leadUpdate).length > 0) {
        await Lead.findByIdAndUpdate(parentDoc.convertedFromLeadId, { $set: leadUpdate });
      }
    }

    // Update StudentFormAnswer (Parental Details section) for each student
    try {
      const sectionKey = "parentalDetails";
      const subSectionKey = "parentGuardian";

      const parentUser = await User.findById(parentDoc.userId).lean();
      const parentEmail = (email !== undefined ? email.trim().toLowerCase() : parentUser?.email) || "";

      for (const studentId of parentDoc.studentIds) {
        const answerDoc = await StudentFormAnswer.findOne({
          studentId,
          partKey: "PROFILE",
        });

        if (answerDoc) {
          const existingEntries: any[] = answerDoc.answers?.[sectionKey]?.[subSectionKey] || [];
          // Find the matching entry by email
          const entryIndex = existingEntries.findIndex(
            (e: any) => e.parentEmail === parentEmail || e.parentEmail === parentUser?.email
          );

          const updatedEntry: any = {
            parentFirstName: firstName !== undefined ? firstName.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentFirstName || "",
            parentMiddleName: middleName !== undefined ? (middleName || "").trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentMiddleName || "",
            parentLastName: lastName !== undefined ? lastName.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentLastName || "",
            parentRelationship: relationship !== undefined ? relationship.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentRelationship || "",
            parentMobile: mobileNumber !== undefined ? mobileNumber.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentMobile || "",
            parentEmail: parentEmail,
            parentQualification: qualification !== undefined ? qualification.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentQualification || "",
            parentOccupation: occupation !== undefined ? occupation.trim() : existingEntries[entryIndex >= 0 ? entryIndex : 0]?.parentOccupation || "",
          };

          if (entryIndex >= 0) {
            existingEntries[entryIndex] = updatedEntry;
          } else {
            existingEntries.push(updatedEntry);
          }

          if (!answerDoc.answers) answerDoc.answers = {};
          if (!answerDoc.answers[sectionKey]) answerDoc.answers[sectionKey] = {};
          answerDoc.answers[sectionKey][subSectionKey] = existingEntries;
          answerDoc.markModified("answers");
          answerDoc.lastSavedAt = new Date();
          await answerDoc.save();
        }
      }
    } catch (formError) {
      console.error("⚠️ Failed to update StudentFormAnswer for parent:", formError);
    }

    // Return updated parent with user populated
    const updatedParent = await Parent.findById(parentId)
      .populate("userId", "firstName middleName lastName email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Parent information updated across all records",
      data: { parent: updatedParent },
    });
  } catch (error: any) {
    console.error("Update parent info error:", error);
    return res.status(500).json({ success: false, message: "Failed to update parent info" });
  }
};

/**
 * Create/add a 2nd parent for a student
 * Allowed by: OPS, IVY_EXPERT, EDUPLAN_COACH, SUPER_ADMIN, STUDENT
 */
export const addParentForStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      relationship,
      mobileNumber,
      email,
      qualification,
      occupation,
    } = req.body;

    if (!firstName || !lastName || !email || !mobileNumber || !relationship) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email, mobileNumber, and relationship are required",
      });
    }

    const parentEmail = email.trim().toLowerCase();

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if a parent user already exists with this email
    let parentUser = await User.findOne({ email: parentEmail });
    if (!parentUser) {
      const otp = generateOTP();
      parentUser = new User({
        firstName: firstName.trim(),
        middleName: (middleName || "").trim(),
        lastName: lastName.trim(),
        email: parentEmail,
        role: USER_ROLE.PARENT,
        isVerified: true,
        isActive: true,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      });
      await parentUser.save();
    }

    // Check if Parent doc exists
    let parentDoc = await Parent.findOne({ userId: parentUser._id });
    if (parentDoc) {
      // Just add studentId if not present
      const sidStr = studentId.toString();
      if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(sidStr)) {
        parentDoc.studentIds.push(new mongoose.Types.ObjectId(studentId));
      }
      // Update fields
      parentDoc.relationship = relationship.trim();
      parentDoc.mobileNumber = mobileNumber.trim();
      parentDoc.qualification = (qualification || "").trim();
      parentDoc.occupation = (occupation || "").trim();
      await parentDoc.save();
    } else {
      parentDoc = new Parent({
        userId: parentUser._id,
        studentIds: [studentId],
        email: parentEmail,
        relationship: relationship.trim(),
        mobileNumber: mobileNumber.trim(),
        qualification: (qualification || "").trim(),
        occupation: (occupation || "").trim(),
      });
      await parentDoc.save();
    }

    // Update StudentFormAnswer — add as 2nd entry in Parental Details
    try {
      const sectionKey = "parentalDetails";
      const subSectionKey = "parentGuardian";

      let answerDoc = await StudentFormAnswer.findOne({
        studentId,
        partKey: "PROFILE",
      });

      const newEntry = {
        parentFirstName: firstName.trim(),
        parentMiddleName: (middleName || "").trim(),
        parentLastName: lastName.trim(),
        parentRelationship: relationship.trim(),
        parentMobile: mobileNumber.trim(),
        parentEmail: parentEmail,
        parentQualification: (qualification || "").trim(),
        parentOccupation: (occupation || "").trim(),
      };

      if (answerDoc) {
        if (!answerDoc.answers) answerDoc.answers = {};
        if (!answerDoc.answers[sectionKey]) answerDoc.answers[sectionKey] = {};
        const existing: any[] = answerDoc.answers[sectionKey][subSectionKey] || [];

        // Check if this parent email already exists
        const idx = existing.findIndex((e: any) => e.parentEmail === parentEmail);
        if (idx >= 0) {
          existing[idx] = newEntry;
        } else {
          existing.push(newEntry);
        }

        answerDoc.answers[sectionKey][subSectionKey] = existing;
        answerDoc.markModified("answers");
        answerDoc.lastSavedAt = new Date();
        await answerDoc.save();
      } else {
        await StudentFormAnswer.create({
          studentId,
          partKey: "PROFILE",
          answers: {
            [sectionKey]: {
              [subSectionKey]: [newEntry],
            },
          },
          lastSavedAt: new Date(),
        });
      }
    } catch (formError) {
      console.error("⚠️ Failed to update form answers for new parent:", formError);
    }

    const result = await Parent.findById(parentDoc._id)
      .populate("userId", "firstName middleName lastName email")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Parent added successfully",
      data: { parent: result },
    });
  } catch (error: any) {
    console.error("Add parent error:", error);
    return res.status(500).json({ success: false, message: "Failed to add parent" });
  }
};
