import mongoose from 'mongoose';
import { IStudentServiceRegistration } from '../models/StudentServiceRegistration';
export declare const createStudentIvyService: (studentUserId: string, ivyExpertUserId: string) => Promise<IStudentServiceRegistration>;
export declare const getStudentsForIvyExpert: (ivyExpertId: string) => Promise<{
    _id: any;
    studentId: {
        _id: any;
        userId: any;
        firstName: any;
        lastName: any;
        email: any;
    };
    status: any;
    overallScore: any;
    studentInterest: any;
    createdAt: any;
}[]>;
export declare const updateStudentInterest: (registrationId: string, interest: string) => Promise<mongoose.Document<unknown, {}, IStudentServiceRegistration, {}, {}> & IStudentServiceRegistration & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const getStudentIvyServiceById: (registrationId: string) => Promise<any>;
export declare const getServiceByStudentId: (studentUserId: string) => Promise<any>;
//# sourceMappingURL=ivyService.service.d.ts.map