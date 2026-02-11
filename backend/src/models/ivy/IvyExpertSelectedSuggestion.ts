import mongoose, { Document, Schema } from 'mongoose';
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

const documentTaskSchema = new Schema({
  title: { type: String, required: true },
  page: { type: Number },
  status: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' }
}, { _id: false });

const ivyExpertDocumentSchema = new Schema({
  url: { type: String, required: true },
  tasks: { type: [documentTaskSchema], default: [] }
}, { _id: false });

const ivyExpertSelectedSuggestionSchema = new Schema<IIvyExpertSelectedSuggestion>({
  studentIvyServiceId: { type: Schema.Types.ObjectId, ref: 'StudentServiceRegistration', required: true },
  agentSuggestionId: { type: Schema.Types.ObjectId, ref: 'AgentSuggestion', required: true },
  pointerNo: { type: Number, enum: Object.values(PointerNo).filter(v => typeof v === 'number') as number[], required: true },
  isVisibleToStudent: { type: Boolean, default: false, required: true },
  weightage: { type: Number, min: 0, max: 100 },
  ivyExpertDocuments: { type: [ivyExpertDocumentSchema], default: [] },
  deadline: { type: Date },
  selectedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IIvyExpertSelectedSuggestion>('IvyExpertSelectedSuggestion', ivyExpertSelectedSuggestionSchema);
