"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("./models/User")); // ✅ MUST use .js (ESM rule)
const MONGO_URI = "mongodb://127.0.0.1:27017/test";
const PASSWORD = "$2b$10$vFjfHRY5gXE2IGA7beUKmOyTPHAUeb7RvyUm3XsCjLqjkmQ5fgKnq";
const ROLES = ["ALUMNI", "STUDENT", "COUNSELOR", "SERVICE_PROVIDER"];
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
        await mongoose_1.default.connect(MONGO_URI);
        console.log("✅ MongoDB connected");
        await User_1.default.deleteMany({});
        console.log("🧹 Users cleared");
        await User_1.default.insertMany(generateUsers());
        console.log(`🎉 ${TOTAL_USERS} users seeded`);
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Seeding error:", err);
        process.exit(1);
    }
};
seedUsers();
//# sourceMappingURL=seed.js.map