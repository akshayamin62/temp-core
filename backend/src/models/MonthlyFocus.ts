import { Schema, model, Document, Types } from 'mongoose';

export interface IMonthlyFocus extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  registrationId: Types.ObjectId;
  month: string; // YYYY-MM format
  academicActivities: string;
  nonAcademicActivities: string;
  habitFocus: string;
  psychologicalGrooming: string;
  physicalGrooming: string;
  readingBooks: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const monthlyFocusSchema = new Schema<IMonthlyFocus>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      required: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    academicActivities: { type: String, default: '' },
    nonAcademicActivities: { type: String, default: '' },
    habitFocus: { type: String, default: '' },
    psychologicalGrooming: { type: String, default: '' },
    physicalGrooming: { type: String, default: '' },
    readingBooks: { type: String, default: '' },
  },
  { timestamps: true }
);

// One focus per student per registration per month
monthlyFocusSchema.index(
  { studentId: 1, registrationId: 1, month: 1 },
  { unique: true }
);

export const MonthlyFocus = model<IMonthlyFocus>('MonthlyFocus', monthlyFocusSchema);
