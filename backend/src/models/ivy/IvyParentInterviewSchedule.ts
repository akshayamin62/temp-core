import mongoose, { Document, Schema } from 'mongoose';

export enum IVY_PARENT_INTERVIEW_STATUS {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum IVY_INTERVIEW_MEETING_MODE {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export interface IIvyParentInterviewSchedule extends Document {
  candidateUserId: mongoose.Types.ObjectId; // student's userId
  subject: string;
  scheduledDate: Date;
  scheduledTime: string; // HH:mm
  duration: number; // 15 | 30 | 45 | 60
  meetingMode: IVY_INTERVIEW_MEETING_MODE;
  meetLink?: string; // for online meetings (manual)
  zohoMeetingKey?: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
  status: IVY_PARENT_INTERVIEW_STATUS;
  scheduledBy: mongoose.Types.ObjectId; // ivy expert or super admin userId
  toName: string; // parent full name (denormalized)
  toEmail: string; // parent email from IvyLeagueRegistration
  toMobile: string; // parent mobile from IvyLeagueRegistration
  notes?: string;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ivyParentInterviewScheduleSchema = new Schema<IIvyParentInterviewSchedule>(
  {
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
      default: 30,
    },
    meetingMode: {
      type: String,
      enum: Object.values(IVY_INTERVIEW_MEETING_MODE),
      default: IVY_INTERVIEW_MEETING_MODE.ONLINE,
    },
    meetLink: {
      type: String,
      trim: true,
      default: null,
    },
    zohoMeetingKey: { type: String, trim: true },
    zohoMeetingUrl: { type: String, trim: true },
    zohoMeetingId: { type: String, trim: true },
    zohoMeetingPassword: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(IVY_PARENT_INTERVIEW_STATUS),
      default: IVY_PARENT_INTERVIEW_STATUS.SCHEDULED,
    },
    scheduledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toName: {
      type: String,
      required: true,
      trim: true,
    },
    toEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    toMobile: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ivyParentInterviewScheduleSchema.index({ candidateUserId: 1 });
ivyParentInterviewScheduleSchema.index({ scheduledBy: 1 });
ivyParentInterviewScheduleSchema.index({ scheduledDate: 1 });

export default mongoose.model<IIvyParentInterviewSchedule>(
  'IvyParentInterviewSchedule',
  ivyParentInterviewScheduleSchema
);
