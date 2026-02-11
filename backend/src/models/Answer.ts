import { Schema, model, Document, Types } from 'mongoose';

// Update history for each answer value
export interface IUpdateHistory {
  value: any; // The value at this point in history
  updatedAt: Date;
  updatedBy: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  updatedByUser: Types.ObjectId; // Reference to User
}

// Individual question answer
export interface IQuestionValue {
  question: Types.ObjectId; // Reference to Question
  value: any; // The actual answer (string, number, date, array, etc.)
  updateHistory: IUpdateHistory[];
}

// Section instance (for handling repeatable sections)
export interface ISectionAnswer {
  section: Types.ObjectId; // Reference to FormSection
  sectionInstanceId: string; // UUID for repeatable sections
  values: IQuestionValue[];
}

// Main Answer document - ONE per student for ALL services
export interface IAnswer extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId; // Reference to Student
  answers: ISectionAnswer[]; // All answers across all services
  createdAt?: Date;
  updatedAt?: Date;
}

const updateHistorySchema = new Schema<IUpdateHistory>({
  value: {
    type: Schema.Types.Mixed,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
    enum: ['STUDENT', 'COUNSELOR', 'ADMIN'],
    required: true,
  },
  updatedByUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { _id: false });

const questionValueSchema = new Schema<IQuestionValue>({
  question: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  value: {
    type: Schema.Types.Mixed, // Can be string, number, date, array, etc.
  },
  updateHistory: [updateHistorySchema],
}, { _id: false });

const sectionAnswerSchema = new Schema<ISectionAnswer>({
  section: {
    type: Schema.Types.ObjectId,
    ref: 'FormSection',
    required: true,
  },
  sectionInstanceId: {
    type: String,
    required: true, // UUID for repeatable sections, or default ID for non-repeatable
  },
  values: [questionValueSchema],
}, { _id: false });

const answerSchema = new Schema<IAnswer>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true, // ONE answer document per student
    },
    answers: [sectionAnswerSchema],
  },
  {
    timestamps: true,
  }
);

// Index for fast student lookup
answerSchema.index({ student: 1 });
answerSchema.index({ 'answers.section': 1 });

export const Answer = model<IAnswer>('Answer', answerSchema);

