import { Schema, model, Document, Types } from 'mongoose';

export enum EditRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RequestedByRole {
  STUDENT = 'STUDENT',
  COUNSELOR = 'COUNSELOR',
}

export enum ApprovedByRole {
  COUNSELOR = 'COUNSELOR',
  ADMIN = 'ADMIN',
}

export interface IEditRequest extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId; // Reference to Student
  service: Types.ObjectId; // Reference to Service
  section: Types.ObjectId; // Reference to FormSection
  sectionInstanceId: string; // Which instance of repeatable section
  question: Types.ObjectId; // Reference to Question
  currentValue: any; // Current value in Answer
  requestedValue: any; // Proposed new value
  requestedBy: RequestedByRole; // STUDENT or COUNSELOR
  requestedByUser: Types.ObjectId; // Reference to User
  status: EditRequestStatus;
  approvedBy?: ApprovedByRole; // COUNSELOR or ADMIN (based on Question.editPolicy)
  approvedByUser?: Types.ObjectId; // Reference to User who approved/rejected
  reason?: string; // Reason for edit request
  rejectionReason?: string; // Reason for rejection (if rejected)
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const editRequestSchema = new Schema<IEditRequest>(
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
    section: {
      type: Schema.Types.ObjectId,
      ref: 'FormSection',
      required: true,
    },
    sectionInstanceId: {
      type: String,
      required: true,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    currentValue: {
      type: Schema.Types.Mixed,
    },
    requestedValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    requestedBy: {
      type: String,
      enum: Object.values(RequestedByRole),
      required: true,
    },
    requestedByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EditRequestStatus),
      default: EditRequestStatus.PENDING,
    },
    approvedBy: {
      type: String,
      enum: Object.values(ApprovedByRole),
    },
    approvedByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
editRequestSchema.index({ student: 1 });
editRequestSchema.index({ service: 1 });
editRequestSchema.index({ status: 1 });
editRequestSchema.index({ approvedByUser: 1 });
editRequestSchema.index({ requestedByUser: 1 });

// Auto-update resolvedAt when status changes
editRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      (this.status === EditRequestStatus.APPROVED || this.status === EditRequestStatus.REJECTED) &&
      !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

export const EditRequest = model<IEditRequest>('EditRequest', editRequestSchema);

