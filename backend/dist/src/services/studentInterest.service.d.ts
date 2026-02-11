import { IStudentServiceRegistration } from '../models/StudentServiceRegistration';
export declare const getStudentInterest: (studentIvyServiceId: string) => Promise<IStudentServiceRegistration>;
/**
 * Update student interest - stores as plain text with overwrite allowed
 * No validation logic applied to studentInterest content
 */
export declare const updateStudentInterest: (studentIvyServiceId: string, studentInterest: string) => Promise<IStudentServiceRegistration>;
//# sourceMappingURL=studentInterest.service.d.ts.map