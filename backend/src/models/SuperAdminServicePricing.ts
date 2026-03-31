import mongoose, { Document, Schema } from 'mongoose';

export interface ISuperAdminServicePricing extends Document {
  serviceSlug: string;
  prices: Map<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

const superAdminServicePricingSchema = new Schema<ISuperAdminServicePricing>(
  {
    serviceSlug: {
      type: String,
      required: true,
      unique: true,
    },
    prices: {
      type: Map,
      of: { type: Number, min: 0 },
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISuperAdminServicePricing>('SuperAdminServicePricing', superAdminServicePricingSchema);
