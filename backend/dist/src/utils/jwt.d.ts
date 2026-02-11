import { JwtPayload } from "jsonwebtoken";
import { IUser } from "../models/User";
export interface TokenPayload extends JwtPayload {
    id: string;
    email: string;
    role: string;
}
export declare const generateToken: (user: IUser) => string;
export declare const verifyToken: (token: string) => TokenPayload;
//# sourceMappingURL=jwt.d.ts.map