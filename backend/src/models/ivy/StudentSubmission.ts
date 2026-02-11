import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentSubmission extends Document {
  studentIvyServiceId: mongoose.Types.ObjectId;
  ivyExpertSelectedSuggestionId: mongoose.Types.ObjectId;
  files: string[];
  remarks?: string;
  submittedAt?: Date;
}

const studentSubmissionSchema = new Schema<IStudentSubmission>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  ivyExpertSelectedSuggestionId: { type: Schema.Types.ObjectId, ref: 'IvyExpertSelectedSuggestion', required: true },
  files: [{ type: String, required: true }],
  remarks: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IStudentSubmission>('StudentSubmission', studentSubmissionSchema);

