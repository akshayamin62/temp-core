import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models to ensure indexes are registered
import '../models/Program';
import '../models/Student';
import '../models/User';
import '../models/StudentServiceRegistration';

dotenv.config();

const createIndexes = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Creating indexes for all collections...');

    // Get all model names
    const modelNames = mongoose.modelNames();
    
    for (const modelName of modelNames) {
      try {
        const model = mongoose.model(modelName);
        console.log(`\n🔨 Creating indexes for ${modelName}...`);
        await model.createIndexes();
        
        // List created indexes
        const indexes = await model.collection.getIndexes();
        console.log(`   ✅ ${Object.keys(indexes).length} indexes created`);
        Object.keys(indexes).forEach(indexName => {
          console.log(`      - ${indexName}`);
        });
      } catch (err: any) {
        console.log(`   ⚠️  Error creating indexes for ${modelName}: ${err.message}`);
      }
    }

    console.log('\n✅ All indexes created successfully!');
    console.log('\n💡 Tip: Run this script after any schema changes');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating indexes:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createIndexes();

