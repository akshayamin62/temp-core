import mongoose, { Document, Schema } from "mongoose";

// TeamMeet Status Enum
export enum TEAMMEET_STATUS {
  PENDING_CONFIRMATION = "PENDING_CONFIRMATION",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

// TeamMeet Type Enum
export enum TEAMMEET_TYPE {
  ONLINE = "ONLINE",
  FACE_TO_FACE = "FACE_TO_FACE",
}

export interface ITeamMeet extends Document {
  subject: string;
  scheduledDate: Date;
  scheduledTime: string; // Format: "HH:mm"
  duration: number; // 15, 30, 45, 60 minutes
  meetingType: TEAMMEET_TYPE;
  zohoMeetingKey?: string; // Zoho meeting session key
  zohoMeetingUrl?: string; // Zoho meeting join URL
  description?: string;
  requestedBy: mongoose.Types.ObjectId; // User who created the meeting
  requestedTo: mongoose.Types.ObjectId; // User who receives the invitation
  adminId: mongoose.Types.ObjectId; // Admin organization context
  status: TEAMMEET_STATUS;
  rejectionMessage?: string; // Required when status is REJECTED
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const teamMeetSchema = new Schema<ITeamMeet>(
  {
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
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
      default: 30,
    },
    meetingType: {
      type: String,
      required: true,
      enum: Object.values(TEAMMEET_TYPE),
      default: TEAMMEET_TYPE.ONLINE,
    },
    zohoMeetingKey: {
      type: String,
      default: null,
    },
    zohoMeetingUrl: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TEAMMEET_STATUS),
      default: TEAMMEET_STATUS.PENDING_CONFIRMATION,
    },
    rejectionMessage: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
teamMeetSchema.index({ requestedBy: 1, scheduledDate: 1 });
teamMeetSchema.index({ requestedTo: 1, scheduledDate: 1 });
teamMeetSchema.index({ adminId: 1 });
teamMeetSchema.index({ status: 1 });
teamMeetSchema.index({ scheduledDate: 1, scheduledTime: 1 });

export default mongoose.model<ITeamMeet>("TeamMeet", teamMeetSchema);
