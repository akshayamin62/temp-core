import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityFeedback extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  registrationId: Types.ObjectId;
  /** 'monthly' for Monthly Focus, 'weekly' for Daily Planner weekly feedback */
  type: 'monthly' | 'weekly';
  /** For monthly: YYYY-MM.  For weekly: the Monday date YYYY-MM-DD */
  period: string;
  /** For weekly: the Sunday date YYYY-MM-DD (end of week) */
  periodEnd?: string;
  feedback: string;
  /** userId of SUPER_ADMIN or EDUPLAN_COACH who wrote the feedback */
  givenBy: Types.ObjectId;
  givenByName: string;
  givenByRole: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const activityFeedbackSchema = new Schema<IActivityFeedback>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
    type: { type: String, enum: ['monthly', 'weekly'], required: true },
    period: { type: String, required: true },
    periodEnd: { type: String },
    feedback: { type: String, required: true },
    givenBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    givenByName: { type: String, required: true },
    givenByRole: { type: String, required: true },
  },
  { timestamps: true }
);

// One feedback per type per period per registration per givenBy
activityFeedbackSchema.index(
  { registrationId: 1, type: 1, period: 1, givenBy: 1 },
  { unique: true }
);

// Query by registration + type
activityFeedbackSchema.index({ registrationId: 1, type: 1 });

export const ActivityFeedback = model<IActivityFeedback>('ActivityFeedback', activityFeedbackSchema);
