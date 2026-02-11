import mongoose, { Document, Schema } from "mongoose";

export enum OPS_SCHEDULE_STATUS {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
}

export interface IOpsSchedule extends Document {
  opsId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId; // Optional for "Me" tasks
  scheduledDate: Date;
  scheduledTime: string; // Format: "HH:mm"
  description: string;
  status: OPS_SCHEDULE_STATUS;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const opsScheduleSchema = new Schema<IOpsSchedule>(
  {
    opsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: false, // Optional - null means task is for OPS themselves
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
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Time must be in HH:mm format",
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(OPS_SCHEDULE_STATUS),
      default: OPS_SCHEDULE_STATUS.SCHEDULED,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
opsScheduleSchema.index({ opsId: 1, scheduledDate: 1 });
opsScheduleSchema.index({ studentId: 1, scheduledDate: 1 });
opsScheduleSchema.index({ status: 1 });

export default mongoose.model<IOpsSchedule>("OpsSchedule", opsScheduleSchema);
