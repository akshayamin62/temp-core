import { Response } from "express";
import { AuthRequest } from "../types/auth";
export declare const getMySchedules: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getScheduleSummary: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getMyStudents: (req: AuthRequest, res: Response) => Promise<any>;
export declare const createSchedule: (req: AuthRequest, res: Response) => Promise<any>;
export declare const updateSchedule: (req: AuthRequest, res: Response) => Promise<any>;
export declare const deleteSchedule: (req: AuthRequest, res: Response) => Promise<any>;
export declare const getScheduleById: (req: AuthRequest, res: Response) => Promise<any>;
export declare const markMissedSchedules: () => Promise<import("mongoose").UpdateWriteOpResult>;
//# sourceMappingURL=opsScheduleController.d.ts.map