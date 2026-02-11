import mongoose, { Document, Schema } from "mongoose";
import { LEAD_STAGE } from "./Lead";

export enum FOLLOWUP_STATUS {
  SCHEDULED = "Scheduled",
  CALL_NOT_ANSWERED = "Call Not Answered",
  PHONE_SWITCHED_OFF = "Phone Switched Off",
  OUT_OF_COVERAGE = "Out of Coverage Area",
  NUMBER_BUSY = "Number Busy",
  CALL_DISCONNECTED = "Call Disconnected",
  INVALID_NUMBER = "Invalid / Wrong Number",
  INCOMING_BARRED = "Incoming Calls Barred",
  CALL_REJECTED = "Call Rejected / Declined",
  CALL_BACK_LATER = "Asked to Call Back Later",
  BUSY_RESCHEDULE = "Busy - Requested Reschedule",
  DISCUSS_WITH_PARENTS = "Need time to discuss with parents",
  RESPONDING_VAGUELY = "Responding Vaguely / Non-committal",
  INTERESTED_NEED_TIME = "Interested - Need Time",
  INTERESTED_DISCUSSING = "Interested - Discussing with Family",
  NOT_INTERESTED = "Not Interested (Explicit)",
  NOT_REQUIRED = "Not Required Anymore",
  REPEATEDLY_NOT_RESPONDING = "Repeatedly Not Responding",
  FAKE_ENQUIRY = "Fake / Test Enquiry",
  DUPLICATE_ENQUIRY = "Duplicate Enquiry",
  CONVERTED_TO_STUDENT = "Converted to Student",
}

export enum MEETING_TYPE {
  ONLINE = "Online",
  FACE_TO_FACE = "Face to Face",
}

export interface IFollowUp extends Document {
  leadId: mongoose.Types.ObjectId;
  counselorId: mongoose.Types.ObjectId; // Reference to Counselor document
  scheduledDate: Date;
  scheduledTime: string; // Format: "HH:mm"
  duration: number; // Duration in minutes (15, 30, 45, 60)
  meetingType: MEETING_TYPE; // Online or Face to Face
  zohoMeetingKey?: string; // Zoho meeting session key
  zohoMeetingUrl?: string; // Zoho meeting join URL
  status: FOLLOWUP_STATUS;
  stageAtFollowUp: LEAD_STAGE; // Stage of lead at the time of follow-up
  stageChangedTo?: LEAD_STAGE; // If stage was changed during this follow-up
  followUpNumber: number; // Sequential number for this lead (1st, 2nd, 3rd follow-up)
  notes?: string;
  createdBy: mongoose.Types.ObjectId; // User who created
  updatedBy?: mongoose.Types.ObjectId; // User who last updated
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const followUpSchema = new Schema<IFollowUp>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    counselorId: {
      type: Schema.Types.ObjectId,
      ref: "Counselor",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Time must be in HH:mm format",
      },
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
      default: 30,
    },
    meetingType: {
      type: String,
      enum: Object.values(MEETING_TYPE),
      required: true,
      default: MEETING_TYPE.ONLINE,
    },
    zohoMeetingKey: {
      type: String,
      default: null,
    },
    zohoMeetingUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.SCHEDULED,
    },
    stageAtFollowUp: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      required: true,
    },
    stageChangedTo: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      default: null,
    },
    followUpNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
followUpSchema.index({ leadId: 1, status: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1, scheduledTime: 1 });
followUpSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model<IFollowUp>("FollowUp", followUpSchema);
