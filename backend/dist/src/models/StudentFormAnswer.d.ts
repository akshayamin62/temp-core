import mongoose, { Document } from "mongoose";
export interface IStudentFormAnswer extends Document {
    studentId: mongoose.Types.ObjectId;
    partKey: string;
    answers: any;
    lastSavedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IStudentFormAnswer, {}, {}, {}, mongoose.Document<unknown, {}, IStudentFormAnswer, {}, {}> & IStudentFormAnswer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentFormAnswer.d.ts.map