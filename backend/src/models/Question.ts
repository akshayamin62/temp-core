import { Schema, model, Document, Types } from 'mongoose';

export enum QuestionType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
}

export enum EditPolicy {
  STUDENT = 'STUDENT',
  COUNSELOR = 'COUNSELOR',
  ADMIN = 'ADMIN',
}

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  label: string; // Question text
  type: QuestionType;
  options?: string[]; // For select/multiselect types
  editPolicy: EditPolicy; // Who can approve changes after submission
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
    },
    options: [{
      type: String,
      trim: true,
    }],
    editPolicy: {
      type: String,
      enum: Object.values(EditPolicy),
      default: EditPolicy.STUDENT,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validation: options required for select/multiselect
questionSchema.pre('save', function(next) {
  if ((this.type === QuestionType.SELECT || this.type === QuestionType.MULTISELECT) && 
      (!this.options || this.options.length === 0)) {
    next(new Error('Options are required for select/multiselect question types'));
  }
  next();
});

// Index for active questions
questionSchema.index({ isActive: 1 });

export const Question = model<IQuestion>('Question', questionSchema);

