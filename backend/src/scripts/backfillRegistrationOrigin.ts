/**
 * Backfill script: Set registeredViaAdvisorId / registeredViaAdminId
 * on existing StudentServiceRegistration documents.
 *
 * Logic:
 * - Look up the student for each registration
 * - If student has advisorId but no adminId → registeredViaAdvisorId = student.advisorId
 * - If student has adminId → registeredViaAdminId = student.adminId
 *   (transferred students: services registered before transfer get advisor, after get admin,
 *    but since we can't know the exact timing, we use a heuristic:
 *    if registration was created BEFORE the student's transfer date → advisor
 *    if registration was created AFTER → admin
 *    If no transfer record exists, use current state)
 *
 * Usage: npx ts-node src/scripts/backfillRegistrationOrigin.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Student from '../models/Student';

async function backfill() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Dynamically import StudentTransfer if it exists
  let StudentTransfer: any;
  try {
    StudentTransfer = (await import('../models/StudentTransfer')).default;
  } catch {
    console.log('StudentTransfer model not found, skipping transfer-aware logic');
  }

  const registrations = await StudentServiceRegistration.find({
    registeredViaAdvisorId: { $exists: false },
    registeredViaAdminId: { $exists: false },
  }).lean();

  console.log(`Found ${registrations.length} registrations to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const student = await Student.findById(reg.studentId).lean();
    if (!student) {
      skipped++;
      continue;
    }

    const update: any = {};

    if (student.adminId && student.advisorId && StudentTransfer) {
      // Transferred student — check transfer date
      const transfer = await StudentTransfer.findOne({
        studentId: student._id,
        status: 'APPROVED',
      }).sort({ updatedAt: -1 }).lean();

      if (transfer) {
        const transferDate = (transfer as any).updatedAt || (transfer as any).createdAt;
        const regDate = reg.registeredAt || reg.createdAt;
        if (regDate && transferDate && new Date(regDate) < new Date(transferDate)) {
          // Registered before transfer → advisor
          update.registeredViaAdvisorId = student.advisorId;
        } else {
          // Registered after transfer → admin
          update.registeredViaAdminId = student.adminId;
        }
      } else {
        // No approved transfer record — assume admin since adminId is set
        update.registeredViaAdminId = student.adminId;
      }
    } else if (student.adminId) {
      update.registeredViaAdminId = student.adminId;
    } else if (student.advisorId) {
      update.registeredViaAdvisorId = student.advisorId;
    } else {
      skipped++;
      continue;
    }

    await StudentServiceRegistration.updateOne({ _id: reg._id }, { $set: update });
    updated++;
  }

  console.log(`Backfill complete: ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
