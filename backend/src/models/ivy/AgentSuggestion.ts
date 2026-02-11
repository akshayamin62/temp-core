import mongoose, { Document, Schema } from 'mongoose';
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

const agentSuggestionSchema = new Schema<IAgentSuggestion>({
  pointerNo: { type: Number, enum: [PointerNo.SpikeInOneArea, PointerNo.LeadershipInitiative, PointerNo.GlobalSocialImpact], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  source: { type: String, enum: ['EXCEL', 'SUPERADMIN'], required: true, default: 'EXCEL' },
  documentUrl: { type: String },
  documentName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAgentSuggestion>('AgentSuggestion', agentSuggestionSchema);

