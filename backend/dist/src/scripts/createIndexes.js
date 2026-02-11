"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import models to ensure indexes are registered
require("../models/Program");
require("../models/Student");
require("../models/User");
require("../models/StudentServiceRegistration");
require("../models/FormField");
require("../models/FormSection");
require("../models/FormSubSection");
dotenv_1.default.config();
const createIndexes = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI not found in environment variables');
        }
        console.log('🔌 Connecting to MongoDB...');
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        console.log('\n📊 Creating indexes for all collections...');
        // Get all model names
        const modelNames = mongoose_1.default.modelNames();
        for (const modelName of modelNames) {
            try {
                const model = mongoose_1.default.model(modelName);
                console.log(`\n🔨 Creating indexes for ${modelName}...`);
                await model.createIndexes();
                // List created indexes
                const indexes = await model.collection.getIndexes();
                console.log(`   ✅ ${Object.keys(indexes).length} indexes created`);
                Object.keys(indexes).forEach(indexName => {
                    console.log(`      - ${indexName}`);
                });
            }
            catch (err) {
                console.log(`   ⚠️  Error creating indexes for ${modelName}: ${err.message}`);
            }
        }
        console.log('\n✅ All indexes created successfully!');
        console.log('\n💡 Tip: Run this script after any schema changes');
        await mongoose_1.default.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating indexes:', error.message);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
};
createIndexes();
//# sourceMappingURL=createIndexes.js.map