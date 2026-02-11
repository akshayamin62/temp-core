import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskMessage {
  sender: 'student' | 'ivyExpert';
  senderName: string;
  text: string;
  timestamp: Date;
  messageType?: 'normal' | 'feedback' | 'action' | 'resource';
  attachment?: {
    name: string;
    url: string;
    size: string;
  };
}

export interface ITaskConversation extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  selectionId: mongoose.Types.ObjectId;
  taskTitle: string;
  taskPage?: string;
  messages: ITaskMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskMessageSchema = new Schema<ITaskMessage>({
  sender: { type: String, enum: ['student', 'ivyExpert'], required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, enum: ['normal', 'feedback', 'action', 'resource'], default: 'normal' },
  attachment: {
    name: String,
    url: String,
    size: String,
  },
}, { _id: true });

const TaskConversationSchema = new Schema<ITaskConversation>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  selectionId: { type: Schema.Types.ObjectId, ref: 'IvyExpertSelectedSuggestion', required: true },
  taskTitle: { type: String, required: true },
  taskPage: { type: String },
  messages: [TaskMessageSchema],
}, { timestamps: true });

// Compound index to ensure one conversation per task
// Sparse index allows multiple documents with null/undefined taskPage
TaskConversationSchema.index({ selectionId: 1, taskTitle: 1, taskPage: 1 }, { unique: true, sparse: true });
TaskConversationSchema.index({ selectionId: 1, taskTitle: 1 }, { unique: true, partialFilterExpression: { taskPage: { $exists: false } } });

export default mongoose.model<ITaskConversation>('TaskConversation', TaskConversationSchema);
