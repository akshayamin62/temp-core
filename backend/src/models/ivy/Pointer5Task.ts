import mongoose, { Schema, Document } from 'mongoose';

export interface IPointer5Task extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    ivyExpertId: mongoose.Types.ObjectId;
    taskDescription: string;
    wordLimit: number;
    attachments: {
        fileName: string;
        fileUrl: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const Pointer5TaskSchema = new Schema<IPointer5Task>(
    {
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
        taskDescription: {
            type: String,
            required: true,
        },
        wordLimit: {
            type: Number,
            default: 500,
        },
        attachments: [
            {
                fileName: { type: String },
                fileUrl: { type: String },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model<IPointer5Task>('Pointer5Task', Pointer5TaskSchema);
