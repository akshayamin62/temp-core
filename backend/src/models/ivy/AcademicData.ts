import mongoose, { Schema, Document } from 'mongoose';

interface ISubject {
    _id?: mongoose.Types.ObjectId;
    name: string;
    marksObtained: number;
    totalMarks: number;
    feedback?: string;
}

interface IProject {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description: string;
    organizationName?: string;
    projectUrl?: string;
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
    testType: 'olympiad' | 'test' | 'project';
    month: string;
    year: number;
    subjects: ISubject[];
    projects: IProject[];
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

const SubjectSchema = new Schema({
    name: { type: String, default: '' },
    marksObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 100 },
    feedback: { type: String, default: '' }
});

const ProjectSchema = new Schema({
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    organizationName: { type: String, default: '' },
    projectUrl: { type: String, default: '' },
    feedback: { type: String, default: '' }
});

const FormalSubSectionSchema = new Schema({
    testType: { 
        type: String, 
        enum: ['weekly', 'month-wise', 'term-wise', 'final-term'], 
        default: 'weekly' 
    },
    month: { type: String, default: 'January' },
    year: { type: Number, default: new Date().getFullYear() },
    subjects: [SubjectSchema],
    overallFeedback: { type: String, default: '' },
    score: { type: Number, min: 0, max: 10, default: 0 }
});

const InformalSubSectionSchema = new Schema({
    testType: { 
        type: String, 
        enum: ['olympiad', 'test', 'project'], 
        default: 'olympiad' 
    },
    month: { type: String, default: 'January' },
    year: { type: Number, default: new Date().getFullYear() },
    subjects: [SubjectSchema],
    projects: [ProjectSchema],
    overallFeedback: { type: String, default: '' },
    score: { type: Number, min: 0, max: 10, default: 0 }
});

const FormalSectionSchema = new Schema({
    examName: { type: String, required: true },
    subSections: [FormalSubSectionSchema]
});

const InformalSectionSchema = new Schema({
    examName: { type: String, required: true },
    subSections: [InformalSubSectionSchema],
    weightage: { type: Number, min: 0, max: 100, default: 0 }
});

const AcademicDataSchema = new Schema({
    studentId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Student', 
        required: true 
    },
    studentIvyServiceId: { 
        type: Schema.Types.ObjectId, 
        ref: 'StudentServiceRegistration', 
        required: true 
    },
    formal: {
        sections: [FormalSectionSchema]
    },
    informal: {
        sections: [InformalSectionSchema]
    }
}, { 
    timestamps: true 
});

// Compound index for unique student-service combination
AcademicDataSchema.index({ studentId: 1, studentIvyServiceId: 1 }, { unique: true });

export default mongoose.model<IAcademicData>('AcademicData', AcademicDataSchema);
