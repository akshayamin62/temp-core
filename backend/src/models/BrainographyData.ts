import mongoose, { Document, Schema } from 'mongoose';

export interface SkillWithPercentage {
  name: string;
  percentage: number;
  rawPercentage?: string; // Original text e.g. "11.56+1X"
}

export interface IBrainographyData extends Document {
  registrationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  // Student info (from PDF)
  studentName: string;
  standard: string; // e.g., "8th", "12th", "FY BTech"
  board: string; // e.g., "CBSE", "ICSE", "State Board", "IB"

  // Extracted fields from Brainography PDF
  highestSkills: SkillWithPercentage[];
  thinkingPattern: string; // dominant: "Logical" | "Emotional"
  thinkingPatternDetails: SkillWithPercentage[]; // [{name:"Logical",percentage:55},{name:"Emotional",percentage:45}]
  achievementStyle: SkillWithPercentage[];
  learningCommunicationStyle: SkillWithPercentage[];
  quotients: SkillWithPercentage[];
  personalityType: string; // "Decisive" | "Expressive" | "Supportive" | "Rule-Conscious"
  careerGoals: string[]; // "A KEY OF CAREER" from the PDF

  // Extraction metadata
  extractedAt: Date;
  extractedFromDocId: mongoose.Types.ObjectId;
  rawExtraction?: string; // Store the raw JSON from ChatGPT for debugging
}

const SkillWithPercentageSchema = new Schema({
  name: { type: String, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  rawPercentage: { type: String, default: '' },
}, { _id: false });

const BrainographyDataSchema = new Schema<IBrainographyData>({
  registrationId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },

  studentName: { type: String, default: '' },
  standard: { type: String, default: '' },
  board: { type: String, default: '' },

  highestSkills: { type: [SkillWithPercentageSchema], default: [] },
  thinkingPattern: { type: String, default: '' },
  thinkingPatternDetails: { type: [SkillWithPercentageSchema], default: [] },
  achievementStyle: { type: [SkillWithPercentageSchema], default: [] },
  learningCommunicationStyle: { type: [SkillWithPercentageSchema], default: [] },
  quotients: { type: [SkillWithPercentageSchema], default: [] },
  personalityType: { type: String, default: '' },
  careerGoals: { type: [String], default: [] },

  extractedAt: { type: Date, default: Date.now },
  extractedFromDocId: { type: Schema.Types.ObjectId, ref: 'StudentDocument' },
  rawExtraction: { type: String },
}, {
  timestamps: true,
});

// Ensure one record per registration
BrainographyDataSchema.index({ registrationId: 1 }, { unique: true });

export default mongoose.model<IBrainographyData>('BrainographyData', BrainographyDataSchema);
