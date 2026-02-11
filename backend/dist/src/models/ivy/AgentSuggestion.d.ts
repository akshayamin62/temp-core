import mongoose, { Document } from 'mongoose';
import { PointerNo } from '../../types/PointerNo';
export interface IAgentSuggestion extends Document {
    pointerNo: PointerNo;
    title: string;
    description: string;
    tags: string[];
    source: 'EXCEL' | 'SUPERADMIN';
    documentUrl?: string;
    documentName?: string;
    createdAt?: Date;
}
declare const _default: mongoose.Model<IAgentSuggestion, {}, {}, {}, mongoose.Document<unknown, {}, IAgentSuggestion, {}, {}> & IAgentSuggestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AgentSuggestion.d.ts.map