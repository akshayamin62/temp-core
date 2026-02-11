import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IDocumentTask {
    title: string;
    page?: number;
    status: 'not-started' | 'in-progress' | 'completed';
}
export interface IIvyExpertDocumentEntry {
    url: string;
    tasks: IDocumentTask[];
}
export interface IIvyExpertSelectedSuggestion extends Document {
    studentIvyServiceId: mongoose.Types.ObjectId;
    agentSuggestionId: mongoose.Types.ObjectId;
    pointerNo: PointerNo;
    isVisibleToStudent: boolean;
    weightage?: number;
    ivyExpertDocuments?: IIvyExpertDocumentEntry[];
    deadline?: Date;
    selectedAt?: Date;
}
declare const _default: mongoose.Model<IIvyExpertSelectedSuggestion, {}, {}, {}, mongoose.Document<unknown, {}, IIvyExpertSelectedSuggestion, {}, {}> & IIvyExpertSelectedSuggestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=IvyExpertSelectedSuggestion.d.ts.map