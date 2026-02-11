import mongoose, { Document } from "mongoose";
import { USER_ROLE } from "../types/roles";
export interface IUser extends Document {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: USER_ROLE;
    isVerified: boolean;
    isActive: boolean;
    otp?: string;
    otpExpires?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map