import mongoose, { Schema, Document } from 'mongoose';

export type IvyTestSection =
  | 'Global Awareness'
  | 'Critical Thinking'
  | 'Academic Aptitude'
  | 'Quantitative Logic';

export interface IIvyTestOption {
  label: string;        // e.g. "A", "B", "C", "D"
  text: string;         // The option content
}

export interface IIvyTestQuestion extends Document {
  section: IvyTestSection;
  questionText: string;
  questionImageUrl?: string;      // optional image for the question
  options: IIvyTestOption[];
  correctOption: string;          // label of the correct option e.g. "A"
  marks: number;
  explanation?: string;           // explanation for the correct answer
  isActive: boolean;              // soft-disable without deleting
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IIvyTestOption>(
  {
    label: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const IvyTestQuestionSchema = new Schema<IIvyTestQuestion>(
  {
    section: {
      type: String,
      required: true,
      enum: ['Global Awareness', 'Critical Thinking', 'Academic Aptitude', 'Quantitative Logic'],
    },
    questionText: { type: String, required: true, trim: true },
    questionImageUrl: { type: String, default: null },
    options: {
      type: [OptionSchema],
      required: true,
      validate: {
        validator: (v: IIvyTestOption[]) => v.length >= 2 && v.length <= 6,
        message: 'A question must have between 2 and 6 options',
      },
    },
    correctOption: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 1, default: 2 },
    explanation: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Index for fast section-wise retrieval
IvyTestQuestionSchema.index({ section: 1, isActive: 1 });

export default mongoose.model<IIvyTestQuestion>('IvyTestQuestion', IvyTestQuestionSchema);
