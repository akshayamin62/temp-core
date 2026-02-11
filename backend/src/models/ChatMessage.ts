import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  opsType?: 'PRIMARY' | 'ACTIVE'; // Only for OPS role
  message: string;
  timestamp: Date;
  readBy: mongoose.Types.ObjectId[];
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramChat',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['STUDENT', 'OPS', 'SUPER_ADMIN', 'ADMIN', 'COUNSELOR'],
      required: true,
    },
    opsType: {
      type: String,
      enum: ['PRIMARY', 'ACTIVE'],
      required: false,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: false,
  }
);

// Index for efficient message retrieval
ChatMessageSchema.index({ chatId: 1, timestamp: -1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

