import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'text' | 'document';

export interface IDocumentMeta {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface IChatMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  opsType?: 'PRIMARY' | 'ACTIVE';
  messageType: MessageType;
  message: string;
  documentMeta?: IDocumentMeta;
  savedToExtra: boolean;
  savedBy?: mongoose.Types.ObjectId;
  savedAt?: Date;
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
    messageType: {
      type: String,
      enum: ['text', 'document'],
      default: 'text',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    documentMeta: {
      fileName: { type: String },
      filePath: { type: String },
      fileSize: { type: Number },
      mimeType: { type: String },
    },
    savedToExtra: {
      type: Boolean,
      default: false,
    },
    savedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    savedAt: {
      type: Date,
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

