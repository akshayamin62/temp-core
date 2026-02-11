import mongoose, { Document, Schema } from "mongoose";

export interface IEduplanCoach extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const eduplanCoachSchema = new Schema<IEduplanCoach>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty if not required
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
  },
  { timestamps: true }
);

export default mongoose.model<IEduplanCoach>("EduplanCoach", eduplanCoachSchema);
