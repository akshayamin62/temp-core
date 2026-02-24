import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Per-question answer tracking ──────────────────────────────────── */
export interface ISessionQuestion {
  questionId: Types.ObjectId;
  selectedOption: string | null;   // "A", "B", "C", "D" or null
  isVisited: boolean;
  isCorrect: boolean | null;       // null until graded
  marksAwarded: number;            // +2, -0.5, or 0
}

/* ── Per-section tracking ──────────────────────────────────────────── */
export interface ISessionSection {
  sectionName: string;             // "Global Awareness" etc.
  questions: ISessionQuestion[];
  questionCount: number;           // 20, 15, 10, 15
  timeLimit: number;               // seconds (e.g. 2700 for 45 min)
  startedAt: Date | null;
  submittedAt: Date | null;
  status: 'locked' | 'in-progress' | 'submitted';
  score: number;                   // section score after grading
}

/* ── Full test session ─────────────────────────────────────────────── */
export interface IIvyTestSession extends Document {
  studentId: Types.ObjectId;
  sections: ISessionSection[];
  totalScore: number;
  maxScore: number;
  status: 'not-started' | 'in-progress' | 'completed';
  violations: number;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schemas ───────────────────────────────────────────────────────── */

const SessionQuestionSchema = new Schema<ISessionQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'IvyTestQuestion', required: true },
    selectedOption: { type: String, default: null },
    isVisited: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

const SessionSectionSchema = new Schema<ISessionSection>(
  {
    sectionName: { type: String, required: true },
    questions: { type: [SessionQuestionSchema], default: [] },
    questionCount: { type: Number, required: true },
    timeLimit: { type: Number, required: true },     // in seconds
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ['locked', 'in-progress', 'submitted'], default: 'locked' },
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

const IvyTestSessionSchema = new Schema<IIvyTestSession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sections: { type: [SessionSectionSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 120 },
    status: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' },
    violations: { type: Number, default: 0 },
  },
  { timestamps: true },
);

IvyTestSessionSchema.index({ studentId: 1 });

export default mongoose.model<IIvyTestSession>('IvyTestSession', IvyTestSessionSchema);
