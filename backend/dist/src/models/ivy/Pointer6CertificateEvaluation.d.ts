import mongoose, { Document } from 'mongoose';
export interface IPointer6CertificateEvaluation extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    certificateId: mongoose.Types.ObjectId;
    score: number;
    feedback?: string;
    evaluatedBy: mongoose.Types.ObjectId;
    evaluatedAt: Date;
}
declare const _default: mongoose.Model<IPointer6CertificateEvaluation, {}, {}, {}, mongoose.Document<unknown, {}, IPointer6CertificateEvaluation, {}, {}> & IPointer6CertificateEvaluation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Pointer6CertificateEvaluation.d.ts.map