/**
 * Migration Script: Convert StudentFormAnswer from ObjectId-keyed to semantic-keyed format
 * 
 * OLD FORMAT: { answers: { [sectionObjectId]: { [subSectionObjectId]: [{ field: value }] } } }
 * NEW FORMAT: { answers: { [sectionKey]: { [subSectionKey]: [{ field: value }] } } }
 * 
 * Run: npx ts-node src/scripts/migrateFormAnswers.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// We need direct DB access since we're removing the old models
async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db!;

  // Step 1: Build a mapping from ObjectId -> semantic key for sections and subsections
  console.log("\n📋 Building ObjectId -> semantic key mapping...");

  const sectionKeyMap: Record<string, string> = {};
  const subSectionKeyMap: Record<string, string> = {};

  // Section title -> semantic key mapping
  const SECTION_KEY_MAP: Record<string, string> = {
    "Personal Details": "personalDetails",
    "Parental Details": "parentalDetails",
    "Academic Qualification": "academicQualification",
    "Work Experience": "workExperience",
    "Tests": "tests",
    "Finance": "finance",
    "Visa": "visa",
    // APPLICATION sections
    "Apply to Program": "applyToProgram",
    "Applied Program": "appliedProgram",
    // DOCUMENT sections
    "Your Documents": "yourDocuments",
    "CORE Documents": "coreDocuments",
    // PAYMENT sections
    "Payment Information": "paymentInformation",
  };

  // SubSection title -> semantic key mapping
  const SUBSECTION_KEY_MAP: Record<string, string> = {
    "Personal Information": "personalInformation",
    "Mailing Address": "mailingAddress",
    "Permanent Address": "permanentAddress",
    "Passport Information": "passportInformation",
    "Nationality": "nationality",
    "Background Information": "backgroundInformation",
    "Additional Information": "additionalInformation",
    "Parent / Guardian Details": "parentGuardian",
    "Education Summary": "educationSummary",
    "Work Experience/Internship": "workExperienceInternship",
    "IELTS": "ielts",
    "GRE": "gre",
    "SAT": "sat",
    "PTE": "pte",
    "TOEFL": "toefl",
    "GMAT": "gmat",
    "Duolingo": "duolingo",
    "Sponsorers": "sponsors",
    "Visa Referred Details": "visaReferred",
    // DOCUMENT sub-sections
    "Primary Documents": "primaryDocuments",
    "Secondary Documents": "secondaryDocuments",
    // PAYMENT sub-sections
    "Payment Details": "paymentDetails",
  };

  // Read sections from DB (before dropping them)
  try {
    const sections = await db.collection("formsections").find({}).toArray();
    for (const section of sections) {
      const key = SECTION_KEY_MAP[section.title];
      if (key) {
        sectionKeyMap[section._id.toString()] = key;
      } else {
        console.warn(`⚠️  Unknown section title: "${section.title}" (_id: ${section._id})`);
        // Use camelCase of title as fallback
        sectionKeyMap[section._id.toString()] = section.title
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+(.)/g, (_: string, c: string) => c.toUpperCase())
          .replace(/^\w/, (c: string) => c.toLowerCase());
      }
    }
    console.log(`  Found ${sections.length} sections`);

    const subSections = await db.collection("formsubsections").find({}).toArray();
    for (const subSection of subSections) {
      const key = SUBSECTION_KEY_MAP[subSection.title];
      if (key) {
        subSectionKeyMap[subSection._id.toString()] = key;
      } else {
        console.warn(`⚠️  Unknown subsection title: "${subSection.title}" (_id: ${subSection._id})`);
        subSectionKeyMap[subSection._id.toString()] = subSection.title
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+(.)/g, (_: string, c: string) => c.toUpperCase())
          .replace(/^\w/, (c: string) => c.toLowerCase());
      }
    }
    console.log(`  Found ${subSections.length} subsections`);
  } catch (err) {
    console.log("  No existing form sections/subsections found in DB (may have been dropped already)");
  }

  // Step 2: Migrate StudentFormAnswer documents
  console.log("\n🔄 Migrating StudentFormAnswer documents...");

  const answers = await db.collection("studentformanswers").find({}).toArray();
  console.log(`  Found ${answers.length} answer documents to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const doc of answers) {
    const oldAnswers = doc.answers;
    if (!oldAnswers || typeof oldAnswers !== "object") {
      console.log(`  Skipping doc ${doc._id} - no answers object`);
      skippedCount++;
      continue;
    }

    // Check if already migrated (semantic keys don't look like ObjectIds)
    const firstKey = Object.keys(oldAnswers)[0];
    if (firstKey && !mongoose.Types.ObjectId.isValid(firstKey)) {
      console.log(`  Skipping doc ${doc._id} (partKey: ${doc.partKey}) - already migrated (key: ${firstKey})`);
      skippedCount++;
      continue;
    }

    const newAnswers: Record<string, any> = {};

    for (const sectionId of Object.keys(oldAnswers)) {
      const sectionKey = sectionKeyMap[sectionId] || sectionId;
      const sectionData = oldAnswers[sectionId];

      if (typeof sectionData !== "object" || sectionData === null) {
        newAnswers[sectionKey] = sectionData;
        continue;
      }

      newAnswers[sectionKey] = {};

      for (const subSectionId of Object.keys(sectionData)) {
        const subSectionKey = subSectionKeyMap[subSectionId] || subSectionId;
        newAnswers[sectionKey][subSectionKey] = sectionData[subSectionId];
      }
    }

    // Update the document
    await db.collection("studentformanswers").updateOne(
      { _id: doc._id },
      { $set: { answers: newAnswers } }
    );

    console.log(`  ✅ Migrated doc ${doc._id} (student: ${doc.studentId}, partKey: ${doc.partKey})`);
    console.log(`     Old keys: ${Object.keys(oldAnswers).join(", ")}`);
    console.log(`     New keys: ${Object.keys(newAnswers).join(", ")}`);
    migratedCount++;
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${answers.length}`);

  // Step 3: Show what collections can be dropped
  console.log("\n🗑️  The following collections can now be dropped:");
  console.log("   - formfields");
  console.log("   - formsubsections");
  console.log("   - formsections");
  console.log("   - formparts");
  console.log("   - serviceformparts");
  console.log("\n   Run the following in MongoDB shell to drop them:");
  console.log('   db.formfields.drop()');
  console.log('   db.formsubsections.drop()');
  console.log('   db.formsections.drop()');
  console.log('   db.formparts.drop()');
  console.log('   db.serviceformparts.drop()');

  await mongoose.disconnect();
  console.log("\n✅ Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
