import mongoose, { Document } from "mongoose";
export interface IOps extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    mobileNumber?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IOps, {}, {}, {}, mongoose.Document<unknown, {}, IOps, {}, {}> & IOps & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Ops.d.ts.map