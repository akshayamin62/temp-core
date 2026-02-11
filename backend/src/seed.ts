import mongoose from "mongoose";
import User from "./models/User"; // ✅ MUST use .js (ESM rule)

const MONGO_URI = "mongodb://127.0.0.1:27017/test";

const PASSWORD =
  "$2b$10$vFjfHRY5gXE2IGA7beUKmOyTPHAUeb7RvyUm3XsCjLqjkmQ5fgKnq";

const ROLES = ["ALUMNI", "STUDENT", "COUNSELOR", "SERVICE_PROVIDER"] as const;

const TOTAL_USERS = 100;

const generateUsers = () => {
  return Array.from({ length: TOTAL_USERS }, (_, i) => ({
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    password: PASSWORD,
    role: ROLES[i % ROLES.length],
    isVerified: false,
    isActive: false,
  }));
};

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    await User.deleteMany({});
    console.log("🧹 Users cleared");

    await User.insertMany(generateUsers());
    console.log(`🎉 ${TOTAL_USERS} users seeded`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedUsers();
