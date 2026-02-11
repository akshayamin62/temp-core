import mongoose, { Document } from 'mongoose';
export interface IPointer5Submission extends Document {
    taskId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    studentResponse: string;
    wordsLearned: string;
    wordCount: number;
    submittedAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPointer5Submission, {}, {}, {}, mongoose.Document<unknown, {}, IPointer5Submission, {}, {}> & IPointer5Submission & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer5Submission.d.ts.map