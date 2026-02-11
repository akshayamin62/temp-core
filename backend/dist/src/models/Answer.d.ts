import { Document, Types } from 'mongoose';
export interface IUpdateHistory {
    value: any;
    updatedAt: Date;
    updatedBy: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
    updatedByUser: Types.ObjectId;
}
export interface IQuestionValue {
    question: Types.ObjectId;
    value: any;
    updateHistory: IUpdateHistory[];
}
export interface ISectionAnswer {
    section: Types.ObjectId;
    sectionInstanceId: string;
    values: IQuestionValue[];
}
export interface IAnswer extends Document {
    _id: Types.ObjectId;
    student: Types.ObjectId;
    answers: ISectionAnswer[];
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const Answer: import("mongoose").Model<IAnswer, {}, {}, {}, Document<unknown, {}, IAnswer, {}, {}> & IAnswer & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Answer.d.ts.map