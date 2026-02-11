import { Request, Response, NextFunction } from "express";
export declare const validateSignup: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (requiredFields: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map