import mongoose from 'mongoose';
import { IPointer6CourseList } from '../models/ivy/Pointer6CourseList';
import { IPointer6Certificate } from '../models/ivy/Pointer6Certificate';
import { IPointer6Evaluation } from '../models/ivy/Pointer6Evaluation';
import { IPointer6CertificateEvaluation } from '../models/ivy/Pointer6CertificateEvaluation';
/** Ivy Expert uploads course list (Excel) */
export declare const uploadCourseList: (studentIvyServiceId: string, ivyExpertId: string, file: Express.Multer.File) => Promise<IPointer6CourseList>;
/** Student uploads one or more completion certificates */
export declare const uploadCertificates: (studentIvyServiceId: string, studentId: string, files: Express.Multer.File[]) => Promise<IPointer6Certificate[]>;
/** Student replaces/re-uploads a specific certificate */
export declare const replaceCertificate: (certificateId: string, studentId: string, file: Express.Multer.File) => Promise<IPointer6Certificate>;
/** Delete a specific certificate (Student) */
export declare const deleteCertificate: (certificateId: string, studentId: string) => Promise<void>;
/** Ivy Expert evaluates a specific certificate */
export declare const evaluateCertificate: (certificateId: string, ivyExpertId: string, score: number, feedback?: string) => Promise<IPointer6CertificateEvaluation>;
/** Ivy Expert assigns Pointer 6 score (DEPRECATED - use individual certificate evaluation) */
export declare const evaluatePointer6: (studentIvyServiceId: string, ivyExpertId: string, score: number, feedback?: string) => Promise<IPointer6Evaluation>;
/** Get Pointer 6 status for a student (by studentId or serviceId) */
export declare const getPointer6Status: (studentIdOrServiceId: string, useServiceId?: boolean) => Promise<{
    studentIvyServiceId: mongoose.Types.ObjectId;
    courseList: {
        _id: mongoose.Types.ObjectId;
        fileName: string;
        fileUrl: string;
        uploadedAt: Date | undefined;
    } | null;
    courses: {
        _id: mongoose.Types.ObjectId;
        srNo: number;
        platform: string;
        courseName: string;
        duration: string;
        fees: string;
        link: string;
        selected: boolean;
        startDate: any;
        endDate: any;
        certificateFileName: any;
        certificateFileUrl: any;
        certificateUploadedAt: any;
        score: any;
        scoredBy: any;
        scoredAt: any;
    }[];
    certificates: {
        _id: mongoose.Types.ObjectId;
        fileName: string;
        fileUrl: string;
        uploadedAt: Date | undefined;
        evaluation: {
            score: any;
            feedback: any;
            evaluatedAt: any;
        } | null;
    }[];
    evaluation: {
        score: number;
        feedback: string | undefined;
        evaluatedAt: Date | undefined;
    } | null;
}>;
/** Select a course with start and end dates */
export declare const selectCourse: (studentIvyServiceId: string, courseId: string, startDate: Date, endDate: Date, userId: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse, {}, {}> & import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Unselect a course */
export declare const unselectCourse: (studentIvyServiceId: string, courseId: string) => Promise<{
    success: boolean;
}>;
/** Upload certificate for a selected course (Student) */
export declare const uploadCourseCertificate: (studentIvyServiceId: string, courseId: string, studentId: string, file: Express.Multer.File) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse, {}, {}> & import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Score a course certificate (Ivy Expert) */
export declare const scoreCourseCertificate: (studentIvyServiceId: string, courseId: string, ivyExpertId: string, score: number) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse, {}, {}> & import("../models/ivy/Pointer6SelectedCourse").IPointer6SelectedCourse & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Calculate and update Pointer 6 score based on all scored certificates */
export declare const updatePointer6Score: (studentIvyServiceId: string) => Promise<number | null>;
/** Get Pointer 6 score */
export declare const getPointer6Score: (studentIvyServiceId: string) => Promise<number>;
//# sourceMappingURL=pointer6.service.d.ts.map