import mongoose, { Document, Schema } from 'mongoose';

export type ChatType = 'open' | 'private';

export interface IProgramChat extends Document {
  programId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  chatType: ChatType;
  participants: {
    student: mongoose.Types.ObjectId;
    OPS?: mongoose.Types.ObjectId;
    superAdmin?: mongoose.Types.ObjectId;
    admin?: mongoose.Types.ObjectId;
    counselor?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProgramChatSchema = new Schema<IProgramChat>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    chatType: {
      type: String,
      enum: ['open', 'private'],
      default: 'open',
      required: true,
    },
    participants: {
      student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      OPS: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      superAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      counselor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one chat per program-student-chatType combination
ProgramChatSchema.index({ programId: 1, studentId: 1, chatType: 1 }, { unique: true });

const ProgramChat = mongoose.model<IProgramChat>('ProgramChat', ProgramChatSchema);

// Drop stale 2-field index if it exists (was replaced by 3-field index including chatType)
ProgramChat.collection.dropIndex('programId_1_studentId_1').catch(() => {
  // Index doesn't exist or already dropped — safe to ignore
});

export default ProgramChat;

