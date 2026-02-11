import { Schema, model, Document, Types } from 'mongoose';

// This is a junction table that links Services to FormSections
// It allows tracking order and service-specific overrides
export interface IServiceSection extends Document {
  _id: Types.ObjectId;
  service: Types.ObjectId; // Reference to Service
  section: Types.ObjectId; // Reference to FormSection
  order: number; // Display order of section within service
  isActive: boolean; // Can be disabled for specific service
  createdAt?: Date;
  updatedAt?: Date;
}

const serviceSectionSchema = new Schema<IServiceSection>(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: 'FormSection',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index: A section can only be added once to a service
serviceSectionSchema.index({ service: 1, section: 1 }, { unique: true });
serviceSectionSchema.index({ service: 1, order: 1 });

export const ServiceSection = model<IServiceSection>('ServiceSection', serviceSectionSchema);

