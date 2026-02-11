import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPointerNotification extends Document {
  studentIvyServiceId: Types.ObjectId;
  userId: Types.ObjectId; // Student or Ivy Expert ID who should see the notification
  userRole: 'student' | 'ivyExpert';
  pointerNumber: number; // 1, 2, 3, 4, 5, 6
  notificationType: string; // e.g., 'document_uploaded', 'activity_assigned', 'message_received', 'task_assigned', etc.
  referenceId?: Types.ObjectId; // ID of the related document/activity/task
  taskTitle?: string; // For task-level notifications (Pointer 2/3/4)
  taskPage?: string; // For task-level notifications (Pointer 2/3/4)
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PointerNotificationSchema = new Schema<IPointerNotification>(
  {
    studentIvyServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    userRole: {
      type: String,
      enum: ['student', 'ivyExpert'],
      required: true,
    },
    pointerNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    notificationType: {
      type: String,
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    taskTitle: {
      type: String,
    },
    taskPage: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PointerNotificationSchema.index({ userId: 1, isRead: 1, pointerNumber: 1 });
PointerNotificationSchema.index({ userId: 1, referenceId: 1, taskTitle: 1, taskPage: 1, isRead: 1 });

export default mongoose.model<IPointerNotification>('PointerNotification', PointerNotificationSchema);
