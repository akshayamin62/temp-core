import User from "../models/User";
import Parent from "../models/Parent";
import Lead from "../models/Lead";
import Student from "../models/Student";
import { USER_ROLE } from "../types/roles";
import { generateOTP } from "./otp";
import mongoose from "mongoose";

/**
 * Sync parent records from StudentFormAnswer parental entries.
 * Finds existing Parent docs linked to the student and updates them
 * in order (index 0 → first parent, index 1 → second parent).
 * Only creates new User/Parent when no existing entry at that index.
 */
export async function syncParentsFromFormAnswers(
  studentId: string | mongoose.Types.ObjectId,
  parentalEntries: any[]
): Promise<void> {
  if (!parentalEntries || !Array.isArray(parentalEntries)) return;

  const sidObj = new mongoose.Types.ObjectId(studentId.toString());

  // Get existing parents linked to this student (ordered by creation)
  const existingParents = await Parent.find({ studentIds: sidObj })
    .sort({ createdAt: 1 })
    .populate("userId");

  for (let i = 0; i < parentalEntries.length; i++) {
    const entry = parentalEntries[i];
    const email = entry.parentEmail?.trim().toLowerCase();
    if (!email) continue;

    const firstName = entry.parentFirstName?.trim() || "";
    const middleName = (entry.parentMiddleName || "").trim();
    const lastName = entry.parentLastName?.trim() || "";
    if (!firstName || !lastName) continue;

    const relationship = (entry.parentRelationship || "").trim();
    const mobileNumber = (entry.parentMobile || "").trim();
    const qualification = (entry.parentQualification || "").trim();
    const occupation = (entry.parentOccupation || "").trim();

    const existingParent = existingParents[i];

    if (existingParent) {
      // Update existing User record (including email if changed)
      const parentUser = await User.findById(existingParent.userId);
      if (parentUser) {
        parentUser.firstName = firstName;
        parentUser.middleName = middleName;
        parentUser.lastName = lastName;
        parentUser.email = email;
        await parentUser.save();
      }

      // Update existing Parent doc
      existingParent.relationship = relationship;
      existingParent.mobileNumber = mobileNumber;
      existingParent.qualification = qualification;
      existingParent.occupation = occupation;
      await existingParent.save();
    } else {
      // No existing parent at this index — check if a user with this email exists
      let parentUser = await User.findOne({ email, role: USER_ROLE.PARENT });
      if (!parentUser) {
        const otp = generateOTP();
        parentUser = new User({
          firstName,
          middleName,
          lastName,
          email,
          role: USER_ROLE.PARENT,
          isVerified: true,
          isActive: true,
          otp,
          otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        });
        await parentUser.save();
      }

      // Check if a Parent doc already exists for this user
      let parentDoc = await Parent.findOne({ userId: parentUser._id });
      if (parentDoc) {
        if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(sidObj.toString())) {
          parentDoc.studentIds.push(sidObj);
        }
        parentDoc.relationship = relationship;
        parentDoc.mobileNumber = mobileNumber;
        parentDoc.qualification = qualification;
        parentDoc.occupation = occupation;
        await parentDoc.save();
      } else {
        await Parent.create({
          userId: parentUser._id,
          studentIds: [studentId],
          relationship,
          mobileNumber,
          qualification,
          occupation,
        });
      }
    }
  }

  // Sync first parent entry to Lead.parentDetail
  try {
    const student = await Student.findById(studentId);
    if (student?.convertedFromLeadId) {
      const firstEntry = parentalEntries[0];
      if (firstEntry?.parentEmail?.trim()) {
        await Lead.findByIdAndUpdate(student.convertedFromLeadId, {
          parentDetail: {
            firstName: (firstEntry.parentFirstName || "").trim(),
            middleName: (firstEntry.parentMiddleName || "").trim(),
            lastName: (firstEntry.parentLastName || "").trim(),
            relationship: (firstEntry.parentRelationship || "").trim(),
            mobileNumber: (firstEntry.parentMobile || "").trim(),
            email: (firstEntry.parentEmail || "").trim().toLowerCase(),
            qualification: (firstEntry.parentQualification || "").trim(),
            occupation: (firstEntry.parentOccupation || "").trim(),
          },
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Lead parentDetail sync failed:", err);
  }
}
