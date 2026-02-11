import { Document, Types } from 'mongoose';
export interface IServiceSection extends Document {
    _id: Types.ObjectId;
    service: Types.ObjectId;
    section: Types.ObjectId;
    order: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const ServiceSection: import("mongoose").Model<IServiceSection, {}, {}, {}, Document<unknown, {}, IServiceSection, {}, {}> & IServiceSection & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ServiceSection.d.ts.map