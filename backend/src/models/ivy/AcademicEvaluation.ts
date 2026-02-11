import mongoose, { Document, Schema } from 'mongoose';

export interface IAcademicEvaluation extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    academicDocumentId: mongoose.Types.ObjectId;
    score: number;
    feedback?: string;
    evaluatedBy: mongoose.Types.ObjectId;
    evaluatedAt: Date;
}

const academicEvaluationSchema = new Schema<IAcademicEvaluation>({
    studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
    academicDocumentId: { type: Schema.Types.ObjectId, ref: 'AcademicDocument', required: true, unique: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    feedback: { type: String },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    evaluatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAcademicEvaluation>('AcademicEvaluation', academicEvaluationSchema);
