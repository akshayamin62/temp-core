import mongoose, { Document, Schema } from "mongoose";
import { B2B_LEAD_STAGE } from "./B2BLead";
import { FOLLOWUP_STATUS, MEETING_TYPE } from "./FollowUp";

export interface IB2BFollowUp extends Document {
  b2bLeadId: mongoose.Types.ObjectId;
  b2bSalesId?: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  meetingType: MEETING_TYPE;
  zohoMeetingKey?: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
  status: FOLLOWUP_STATUS;
  stageAtFollowUp: B2B_LEAD_STAGE;
  stageChangedTo?: B2B_LEAD_STAGE;
  followUpNumber: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const b2bFollowUpSchema = new Schema<IB2BFollowUp>(
  {
    b2bLeadId: {
      type: Schema.Types.ObjectId,
      ref: "B2BLead",
      required: true,
    },
    b2bSalesId: {
      type: Schema.Types.ObjectId,
      ref: "B2BSales",
      required: false,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
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
    zohoMeetingKey: { type: String, default: null },
    zohoMeetingUrl: { type: String, default: null },
    zohoMeetingId: { type: String, default: null },
    zohoMeetingPassword: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.SCHEDULED,
    },
    stageAtFollowUp: {
      type: String,
      enum: Object.values(B2B_LEAD_STAGE),
      required: true,
    },
    stageChangedTo: {
      type: String,
      enum: Object.values(B2B_LEAD_STAGE),
      default: null,
    },
    followUpNumber: { type: Number, required: true, default: 1 },
    notes: { type: String, default: "" },
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
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

b2bFollowUpSchema.index({ b2bLeadId: 1, status: 1 });
b2bFollowUpSchema.index({ b2bSalesId: 1, scheduledDate: 1 });
b2bFollowUpSchema.index({ b2bSalesId: 1, scheduledDate: 1, scheduledTime: 1 });
b2bFollowUpSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model<IB2BFollowUp>("B2BFollowUp", b2bFollowUpSchema);
