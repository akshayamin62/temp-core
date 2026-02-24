import mongoose, { Document, Schema } from "mongoose";

export enum CurriculumType {
  CBSE = "CBSE",
  STATE_BOARD = "State Board",
  ICSE = "ICSE",
  IGCSE = "IGCSE",
  INTERNATIONAL_BACCALAUREATE = "International Baccalaureate",
  CAMBRIDGE = "Cambridge",
}

export interface IIvyLeagueRegistration extends Document {
  studentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  firstName: string;
  middleName?: string;
  lastName: string;
  parentFirstName: string;
  parentMiddleName?: string;
  parentLastName: string;
  parentMobile: string;
  parentEmail: string;
  schoolName: string;
  curriculum: CurriculumType;
  currentGrade: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ivyLeagueRegistrationSchema = new Schema<IIvyLeagueRegistration>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      required: false,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    parentFirstName: {
      type: String,
      required: true,
      trim: true,
    },
    parentMiddleName: {
      type: String,
      required: false,
      trim: true,
    },
    parentLastName: {
      type: String,
      required: true,
      trim: true,
    },
    parentMobile: {
      type: String,
      required: true,
      trim: true,
    },
    parentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    curriculum: {
      type: String,
      enum: Object.values(CurriculumType),
      required: true,
    },
    currentGrade: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One registration per student
ivyLeagueRegistrationSchema.index({ studentId: 1 }, { unique: true });

export default mongoose.model<IIvyLeagueRegistration>(
  "IvyLeagueRegistration",
  ivyLeagueRegistrationSchema
);
