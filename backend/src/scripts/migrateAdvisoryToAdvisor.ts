/**
 * Migration Script: Advisory → Advisor
 * 
 * This script renames all "advisory" fields to "advisor" in MongoDB collections,
 * and updates the USER_ROLE enum value from "ADVISORY" to "ADVISOR" in the users collection.
 * 
 * Also renames the ProgramChat participants.advisory field to participants.advisor
 * and updates ChatMessage senderRole from "ADVISORY" to "ADVISOR".
 * 
 * Run this ONCE after deploying the code changes.
 * 
 * Usage:
 *   npx ts-node src/scripts/migrateAdvisoryToAdvisor.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || "";

async function migrate() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  console.log("Connected to MongoDB\n");

  // 1. Rename advisoryId → advisorId in students collection
  const studentsResult = await db.collection("students").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`students: renamed advisoryId → advisorId (${studentsResult.modifiedCount} docs)`);

  // 2. Rename advisoryId → advisorId in leads collection
  const leadsResult = await db.collection("leads").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`leads: renamed advisoryId → advisorId (${leadsResult.modifiedCount} docs)`);

  // 3. Rename registeredViaAdvisoryId → registeredViaAdvisorId in studentserviceregistrations
  const ssrResult = await db.collection("studentserviceregistrations").updateMany(
    { registeredViaAdvisoryId: { $exists: true } },
    { $rename: { registeredViaAdvisoryId: "registeredViaAdvisorId" } }
  );
  console.log(`studentserviceregistrations: renamed registeredViaAdvisoryId → registeredViaAdvisorId (${ssrResult.modifiedCount} docs)`);

  // 4. Rename fromAdvisoryId → fromAdvisorId in studenttransfers
  const stResult = await db.collection("studenttransfers").updateMany(
    { fromAdvisoryId: { $exists: true } },
    { $rename: { fromAdvisoryId: "fromAdvisorId" } }
  );
  console.log(`studenttransfers: renamed fromAdvisoryId → fromAdvisorId (${stResult.modifiedCount} docs)`);

  // 5. Rename advisoryId → advisorId in servicepricings
  const spResult = await db.collection("servicepricings").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`servicepricings: renamed advisoryId → advisorId (${spResult.modifiedCount} docs)`);

  // 6. Rename advisoryId → advisorId in followups
  const fuResult = await db.collection("followups").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`followups: renamed advisoryId → advisorId (${fuResult.modifiedCount} docs)`);

  // 7. Rename advisoryId → advisorId in payments
  const payResult = await db.collection("payments").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`payments: renamed advisoryId → advisorId (${payResult.modifiedCount} docs)`);

  // 8. Rename advisoryId → advisorId in invoices
  const invResult = await db.collection("invoices").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`invoices: renamed advisoryId → advisorId (${invResult.modifiedCount} docs)`);

  // 9. Rename advisoryId → advisorId in leadstudentconversions
  const lscResult = await db.collection("leadstudentconversions").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`leadstudentconversions: renamed advisoryId → advisorId (${lscResult.modifiedCount} docs)`);

  // 10. Rename advisoryId → advisorId in studentplandiscounts
  const spdResult = await db.collection("studentplandiscounts").updateMany(
    { advisoryId: { $exists: true } },
    { $rename: { advisoryId: "advisorId" } }
  );
  console.log(`studentplandiscounts: renamed advisoryId → advisorId (${spdResult.modifiedCount} docs)`);

  // 11. Rename participants.advisory → participants.advisor in programchats
  const pcResult = await db.collection("programchats").updateMany(
    { "participants.advisory": { $exists: true } },
    { $rename: { "participants.advisory": "participants.advisor" } }
  );
  console.log(`programchats: renamed participants.advisory → participants.advisor (${pcResult.modifiedCount} docs)`);

  // 12. Update senderRole "ADVISORY" → "ADVISOR" in chatmessages
  const cmResult = await db.collection("chatmessages").updateMany(
    { senderRole: "ADVISORY" },
    { $set: { senderRole: "ADVISOR" } }
  );
  console.log(`chatmessages: updated senderRole ADVISORY → ADVISOR (${cmResult.modifiedCount} docs)`);

  // 13. Update role "ADVISORY" → "ADVISOR" in users collection
  const usersResult = await db.collection("users").updateMany(
    { role: "ADVISORY" },
    { $set: { role: "ADVISOR" } }
  );
  console.log(`users: updated role ADVISORY → ADVISOR (${usersResult.modifiedCount} docs)`);

  console.log("\n✅ Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
