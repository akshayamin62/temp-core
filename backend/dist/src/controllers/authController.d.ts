import { Response } from "express";
import { USER_ROLE } from "../types/roles";
import { Request } from "express";
interface SignupRequest extends Request {
    body: {
        firstName: string;
        middleName?: string;
        lastName: string;
        email: string;
        role: USER_ROLE;
        captcha: string;
        captchaInput: string;
    };
}
interface LoginRequest extends Request {
    body: {
        email: string;
        captcha: string;
        captchaInput: string;
    };
}
interface VerifyOTPRequest extends Request {
    body: {
        email: string;
        otp: string;
    };
}
export declare const signup: (req: SignupRequest, res: Response) => Promise<Response>;
export declare const login: (req: LoginRequest, res: Response) => Promise<Response>;
export declare const verifySignupOTP: (req: VerifyOTPRequest, res: Response) => Promise<Response>;
export declare const verifyOTP: (req: VerifyOTPRequest, res: Response) => Promise<Response>;
export declare const getProfile: (req: Request, res: Response) => Promise<Response>;
export {};
//# sourceMappingURL=authController.d.ts.map