import mongoose, { Document } from 'mongoose';
interface ISubject {
    _id?: mongoose.Types.ObjectId;
    name: string;
    marksObtained: number;
    totalMarks: number;
    feedback?: string;
}
interface IFormalSubSection {
    _id?: mongoose.Types.ObjectId;
    testType: 'weekly' | 'month-wise' | 'term-wise' | 'final-term';
    month: string;
    year: number;
    subjects: ISubject[];
    overallFeedback?: string;
    score?: number;
}
interface IInformalSubSection {
    _id?: mongoose.Types.ObjectId;
    testType: 'olympiad' | 'test';
    month: string;
    year: number;
    subjects: ISubject[];
    overallFeedback?: string;
    score?: number;
}
interface IFormalSection {
    _id?: mongoose.Types.ObjectId;
    examName: string;
    subSections: IFormalSubSection[];
}
interface IInformalSection {
    _id?: mongoose.Types.ObjectId;
    examName: string;
    subSections: IInformalSubSection[];
    weightage?: number;
}
export interface IAcademicData extends Document {
    studentId: mongoose.Types.ObjectId;
    studentIvyServiceId: mongoose.Types.ObjectId;
    formal: {
        sections: IFormalSection[];
    };
    informal: {
        sections: IInformalSection[];
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAcademicData, {}, {}, {}, mongoose.Document<unknown, {}, IAcademicData, {}, {}> & IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AcademicData.d.ts.map