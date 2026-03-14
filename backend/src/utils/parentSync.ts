import User from "../models/User";
import Parent from "../models/Parent";
import Lead from "../models/Lead";
import Student from "../models/Student";
import { USER_ROLE } from "../types/roles";
import { generateOTP } from "./otp";
import mongoose from "mongoose";

/**
 * Link an existing parent User to a new student, or create a fresh User+Parent.
 *
 * - If a User with `email` already exists (role PARENT):
 *     → only push `sidObj` into Parent.studentIds — never update any other fields.
 * - If no User exists:
 *     → create User + Parent with the supplied fields.
 */
async function linkOrCreateParent(
  sidObj: mongoose.Types.ObjectId,
  email: string,
  fields: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    relationship: string;
    mobileNumber: string;
    qualification: string;
    occupation: string;
  }
): Promise<void> {
  let parentUser = await User.findOne({ email, role: USER_ROLE.PARENT });

  if (!parentUser) {
    // No existing parent with this email — create User + Parent
    const otp = generateOTP();
    parentUser = new User({
      firstName: fields.firstName,
      middleName: fields.middleName,
      lastName: fields.lastName,
      email,
      role: USER_ROLE.PARENT,
      isVerified: true,
      isActive: true,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });
    await parentUser.save();

    await Parent.create({
      userId: parentUser._id,
      studentIds: [sidObj],
      email: fields.email,
      relationship: fields.relationship,
      mobileNumber: fields.mobileNumber,
      qualification: fields.qualification,
      occupation: fields.occupation,
    });
  } else {
    // User already exists — only add the studentId, never update existing fields
    let parentDoc = await Parent.findOne({ userId: parentUser._id });
    if (parentDoc) {
      if (!parentDoc.studentIds.map((id: any) => id.toString()).includes(sidObj.toString())) {
        parentDoc.studentIds.push(sidObj);
        await parentDoc.save();
      }
    } else {
      // Edge case: User exists but no Parent doc — create one
      await Parent.create({
        userId: parentUser._id,
        studentIds: [sidObj],
        email: fields.email,
        relationship: fields.relationship,
        mobileNumber: fields.mobileNumber,
        qualification: fields.qualification,
        occupation: fields.occupation,
      });
    }
  }
}

/**
 * Sync parent records from StudentFormAnswer parental entries.
 *
 * Rules (by index position):
 *
 * A. Parent already linked to this student at index i:
 *    - Same email  → update all non-email fields on User + Parent (staff edit)
 *    - Email changed → detach student from old parent
 *        · If old parent has no remaining students → delete Parent + User docs
 *        · Otherwise → keep old Parent + User, just remove this studentId
 *      Then apply rule B with the new email.
 *
 * B. No parent linked at index i yet:
 *    - Email exists in system → push studentId only, never update fields
 *    - Email not in system    → create User + Parent with supplied fields
 *
 * StudentFormAnswer always stores whatever the user typed — no validation
 * against User/Parent model data (name, phone, etc. can differ).
 */
export async function syncParentsFromFormAnswers(
  studentId: string | mongoose.Types.ObjectId,
  parentalEntries: any[]
): Promise<void> {
  if (!parentalEntries || !Array.isArray(parentalEntries)) return;

  const sidObj = new mongoose.Types.ObjectId(studentId.toString());

  // Get existing parents linked to this student, ordered by creation (index-based)
  const existingParents = await Parent.find({ studentIds: sidObj })
    .sort({ createdAt: 1 })
    .populate<{ userId: any }>("userId");

  for (let i = 0; i < parentalEntries.length; i++) {
    const entry = parentalEntries[i];
    const email = entry.parentEmail?.trim().toLowerCase();
    if (!email) continue;

    const firstName    = (entry.parentFirstName    || "").trim();
    const middleName   = (entry.parentMiddleName   || "").trim();
    const lastName     = (entry.parentLastName     || "").trim();
    const relationship = (entry.parentRelationship || "").trim();
    const mobileNumber = (entry.parentMobile       || "").trim();
    const qualification= (entry.parentQualification|| "").trim();
    const occupation   = (entry.parentOccupation   || "").trim();

    const existingParent = existingParents[i];

    if (existingParent) {
      // Rule A: a parent is already linked to this student at this index
      const populatedUser = existingParent.userId as any;
      const existingEmail = (populatedUser?.email || "").toLowerCase();

      if (existingEmail === email) {
        // Same email — update all non-email fields on User + Parent
        const parentUser = await User.findById(populatedUser?._id ?? populatedUser);
        if (parentUser) {
          parentUser.firstName  = firstName;
          parentUser.middleName = middleName;
          parentUser.lastName   = lastName;
          await parentUser.save();
        }
        existingParent.email         = email;
        existingParent.relationship  = relationship;
        existingParent.mobileNumber  = mobileNumber;
        existingParent.qualification = qualification;
        existingParent.occupation    = occupation;
        await existingParent.save();
      } else {
        // Email changed — detach student from old parent
        const oldParentDoc = await Parent.findById(existingParent._id);

        if (oldParentDoc) {
          (oldParentDoc.studentIds as any) = oldParentDoc.studentIds.filter(
            (id: any) => id.toString() !== sidObj.toString()
          );
          await oldParentDoc.save();
        }

        // Then link or create with the new email (Rule B)
        await linkOrCreateParent(sidObj, email, {
          firstName, middleName, lastName, email, relationship, mobileNumber, qualification, occupation,
        });
      }
    } else {
      // Rule B: no parent linked at this index
      await linkOrCreateParent(sidObj, email, {
        firstName, middleName, lastName, email, relationship, mobileNumber, qualification, occupation,
      });
    }
  }

  // Sync first parent entry to Lead.parentDetail (uses StudentFormAnswer data)
  try {
    const student = await Student.findById(studentId);
    if (student?.convertedFromLeadId) {
      const firstEntry = parentalEntries[0];
      if (firstEntry?.parentEmail?.trim()) {
        await Lead.findByIdAndUpdate(student.convertedFromLeadId, {
          parentDetail: {
            firstName:    (firstEntry.parentFirstName    || "").trim(),
            middleName:   (firstEntry.parentMiddleName   || "").trim(),
            lastName:     (firstEntry.parentLastName     || "").trim(),
            relationship: (firstEntry.parentRelationship || "").trim(),
            mobileNumber: (firstEntry.parentMobile       || "").trim(),
            email:        (firstEntry.parentEmail        || "").trim().toLowerCase(),
            qualification:(firstEntry.parentQualification|| "").trim(),
            occupation:   (firstEntry.parentOccupation   || "").trim(),
          },
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Lead parentDetail sync failed:", err);
  }
}
