import mongoose, { Schema, Document } from 'mongoose';

export interface IPointer5Submission extends Document {
    taskId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    studentResponse: string;
    wordsLearned: string;
    wordCount: number;
    submittedAt: Date;
    updatedAt: Date;
}

const Pointer5SubmissionSchema = new Schema<IPointer5Submission>(
    {
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
        studentResponse: {
            type: String,
            required: true,
        },
        wordsLearned: {
            type: String,
            default: '',
        },
        wordCount: {
            type: Number,
            default: 0,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model<IPointer5Submission>('Pointer5Submission', Pointer5SubmissionSchema);
