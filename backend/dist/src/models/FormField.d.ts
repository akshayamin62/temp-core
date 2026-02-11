import mongoose, { Document } from "mongoose";
export declare enum FieldType {
    TEXT = "TEXT",
    EMAIL = "EMAIL",
    NUMBER = "NUMBER",
    DATE = "DATE",
    PHONE = "PHONE",
    TEXTAREA = "TEXTAREA",
    SELECT = "SELECT",
    RADIO = "RADIO",
    CHECKBOX = "CHECKBOX",
    FILE = "FILE",
    COUNTRY = "COUNTRY",
    STATE = "STATE",
    CITY = "CITY"
}
export interface IFormField extends Document {
    subSectionId: mongoose.Types.ObjectId;
    label: string;
    key: string;
    type: FieldType;
    placeholder?: string;
    helpText?: string;
    required: boolean;
    order: number;
    isActive: boolean;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    options?: Array<{
        label: string;
        value: string;
    }>;
    defaultValue?: any;
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IFormField, {}, {}, {}, mongoose.Document<unknown, {}, IFormField, {}, {}> & IFormField & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FormField.d.ts.map