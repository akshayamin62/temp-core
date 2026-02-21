import mongoose, { Document, Schema } from 'mongoose';

export enum PortfolioType {
  CAREER = 'career',
  DEVELOPMENT = 'development',
}

export enum PortfolioStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface IPortfolio extends Document {
  registrationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  reportType: PortfolioType;
  selectedCareerGoals: string[]; // max 2 career goals chosen by student
  status: PortfolioStatus;

  // Generated report content (raw text)
  reportContent: string;

  // Generated DOCX file
  fileName: string;
  filePath: string;
  fileSize: number;

  generatedAt: Date;
  generationError?: string;
  topicLabel: string; // e.g. "STEM, Medicine" — groups career+dev pair
}

const PortfolioSchema = new Schema<IPortfolio>({
  registrationId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  reportType: { type: String, enum: Object.values(PortfolioType), required: true },
  selectedCareerGoals: { type: [String], required: true },
  status: { type: String, enum: Object.values(PortfolioStatus), default: PortfolioStatus.PENDING },

  reportContent: { type: String, default: '' },

  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },

  generatedAt: { type: Date },
  generationError: { type: String },
  topicLabel: { type: String, default: '' },
}, {
  timestamps: true,
});

// Unique per registration + reportType + topicLabel
PortfolioSchema.index({ registrationId: 1, reportType: 1, topicLabel: 1 }, { unique: true });

export default mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
