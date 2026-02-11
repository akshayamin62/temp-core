import { Schema, model, Document, Types } from 'mongoose';

export enum EnrollmentStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
}

export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId; // Reference to Student
  service: Types.ObjectId; // Reference to Service
  assignedCounselor?: Types.ObjectId; // Reference to Counselor (nullable)
  status: EnrollmentStatus;
  startedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    assignedCounselor: {
      type: Schema.Types.ObjectId,
      ref: 'Counselor',
    },
    status: {
      type: String,
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.NOT_STARTED,
    },
    startedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index: A student can only enroll once per service
enrollmentSchema.index({ student: 1, service: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ service: 1 });
enrollmentSchema.index({ assignedCounselor: 1 });
enrollmentSchema.index({ status: 1 });

// Auto-update timestamps based on status changes
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    if (this.status === EnrollmentStatus.IN_PROGRESS && !this.startedAt) {
      this.startedAt = now;
    } else if (this.status === EnrollmentStatus.SUBMITTED && !this.submittedAt) {
      this.submittedAt = now;
    } else if (this.status === EnrollmentStatus.COMPLETED && !this.completedAt) {
      this.completedAt = now;
    }
  }
  next();
});

export const Enrollment = model<IEnrollment>('Enrollment', enrollmentSchema);

