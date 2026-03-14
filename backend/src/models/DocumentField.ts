import mongoose, { Document, Schema } from "mongoose";

export interface IDocumentField extends Document {
  documentName: string;
  documentKey: string;
  category: "PRIMARY" | "SECONDARY";
  required: boolean;
  helpText?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentFieldSchema = new Schema<IDocumentField>(
  {
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true, unique: true },
    category: { type: String, enum: ["PRIMARY", "SECONDARY"], required: true },
    required: { type: Boolean, default: false },
    helpText: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDocumentField>("DocumentField", documentFieldSchema);
