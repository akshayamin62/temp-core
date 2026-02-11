export interface IvyExpertMetrics {
    ivyExpertId: string;
    ivyExpertName: string;
    email: string;
    studentsHandled: number;
    averageStudentScore: number;
    taskCompletionRate: number;
}
export declare const getIvyExpertPerformance: () => Promise<IvyExpertMetrics[]>;
//# sourceMappingURL=ivyExpertPerformance.service.d.ts.map