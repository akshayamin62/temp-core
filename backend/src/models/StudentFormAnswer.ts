import mongoose, { Document, Schema } from "mongoose";

export interface IStudentFormAnswer extends Document {
  studentId: mongoose.Types.ObjectId;  // Direct link to Student model
  partKey: string;  // PROFILE, APPLICATION, DOCUMENT, PAYMENT
  answers: any;  // All answers for this part (all sections combined)
  lastSavedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentFormAnswerSchema = new Schema<IStudentFormAnswer>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    partKey: {
      type: String,
      required: true,
    },
    answers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index - one answer document per student per part
studentFormAnswerSchema.index({ studentId: 1, partKey: 1 }, { unique: true });

export default mongoose.model<IStudentFormAnswer>(
  "StudentFormAnswer",
  studentFormAnswerSchema
);


