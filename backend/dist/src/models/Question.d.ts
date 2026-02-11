import { Document, Types } from 'mongoose';
export declare enum QuestionType {
    TEXT = "text",
    NUMBER = "number",
    DATE = "date",
    SELECT = "select",
    MULTISELECT = "multiselect"
}
export declare enum EditPolicy {
    STUDENT = "STUDENT",
    COUNSELOR = "COUNSELOR",
    ADMIN = "ADMIN"
}
export interface IQuestion extends Document {
    _id: Types.ObjectId;
    label: string;
    type: QuestionType;
    options?: string[];
    editPolicy: EditPolicy;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const Question: import("mongoose").Model<IQuestion, {}, {}, {}, Document<unknown, {}, IQuestion, {}, {}> & IQuestion & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Question.d.ts.map