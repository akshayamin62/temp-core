import mongoose, { Schema, Document } from 'mongoose';

export interface ISPService extends Document {
  serviceProviderId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  price?: number;
  priceType: 'Fixed' | 'Starting From' | 'Contact for Price';
  thumbnail?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SPServiceSchema = new Schema<ISPService>(
  {
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
    },
    priceType: {
      type: String,
      enum: ['Fixed', 'Starting From', 'Contact for Price'],
      default: 'Contact for Price',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISPService>('SPService', SPServiceSchema);
