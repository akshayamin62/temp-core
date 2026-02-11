import mongoose, { Schema, Document } from 'mongoose';

export interface IPointer5Evaluation extends Document {
    submissionId: mongoose.Types.ObjectId;
    taskId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    ivyExpertId: mongoose.Types.ObjectId;
    score: number;
    feedback: string;
    evaluatedAt: Date;
}

const Pointer5EvaluationSchema = new Schema<IPointer5Evaluation>(
    {
        submissionId: {
            type: Schema.Types.ObjectId,
            ref: 'Pointer5Submission',
            required: true,
        },
        taskId: {
            type: Schema.Types.ObjectId,
            ref: 'Pointer5Task',
            required: true,
        },
        studentIvyServiceId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentServiceRegistration',
            required: true,
        },
        ivyExpertId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        feedback: {
            type: String,
            default: '',
        },
        evaluatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const Pointer5EvaluationModel = mongoose.model<IPointer5Evaluation>('Pointer5Evaluation', Pointer5EvaluationSchema);

// Drop stale unique index on studentIvyServiceId if it exists (from older schema).
// A student can have multiple evaluations (one per task), so this must NOT be unique.
Pointer5EvaluationModel.collection.dropIndex('studentIvyServiceId_1').catch(() => {
    // Index may not exist — ignore
});

export default Pointer5EvaluationModel;
