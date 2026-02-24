import { Schema, model, Document, Types } from 'mongoose';

/* ── Sub-document interfaces ── */

export interface IPlanRow {
  time: string;
  activity: string;
  type: '' | 'A' | 'RB' | 'N' | 'H' | 'PS' | 'PH';
  completed: 'Completed' | 'Not Started' | 'In Progress' | '';
  experience: string;
}

export interface ISessionPlan {
  session: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  rows: IPlanRow[];
}

export interface INightLog {
  mobileTime: number; // minutes
  socialMediaTime: number;
  studyTime: number;
  physicalExerciseTime: number;
  readingTime: number;
  newWords: string[]; // up to 5
}

export interface ISelfCare {
  sleepRating: number; // 0-5
  exerciseRating: number;
  dietRating: number;
  studyTimeRating: number;
  productivityRating: number;
  selfReflection: string;
  selfReflectionRating: number;
  skillsUsed: string;
  skillsUsedRating: number;
  achievements: string;
  achievementsRating: number;
}

/* ── Main interface ── */

export interface IDailyPlanner extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  registrationId: Types.ObjectId;
  date: string; // YYYY-MM-DD

  // Tab 1: Morning Log
  feeling: string;
  affirmation: string;

  feelingRating: number;

  // Tab 1b: Today's Goal
  goalAcademic: string;
  goalNonAcademic: string;
  goalHabitFocus: string;
  goalPsychological: string;
  goalPhysical: string;
  goalReadingBooks: string;

  // Meal & sleep times (HH:MM)
  wakeupTime: string;
  lunchTime: string;
  dinnerTime: string;
  sleepTime: string;

  // Tab 2: Today's Plan
  plans: ISessionPlan[];

  // Tab 3: Accomplishments (derived from plans — blessings/happyMoment are standalone)
  blessings: string;
  blessingsRating: number;
  happyMoment: string;
  happyMomentRating: number;

  // Tab 4: Night Log
  nightLog: INightLog;

  // Tab 5: Self-Care Tracker
  selfCare: ISelfCare;

  createdAt?: Date;
  updatedAt?: Date;
}

/* ── Sub-schemas ── */

const planRowSchema = new Schema<IPlanRow>(
  {
    time: { type: String, default: '' },
    activity: { type: String, default: '' },
    type: { type: String, enum: ['', 'A', 'RB', 'N', 'H', 'PS', 'PH'], default: '' },
    completed: { type: String, enum: ['Completed', 'Not Started', 'In Progress', ''], default: '' },
    experience: { type: String, default: '' },
  },
  { _id: false }
);

const sessionPlanSchema = new Schema<ISessionPlan>(
  {
    session: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
      required: true,
    },
    rows: [planRowSchema],
  },
  { _id: false }
);

const nightLogSchema = new Schema<INightLog>(
  {
    mobileTime: { type: Number, default: 0 },
    socialMediaTime: { type: Number, default: 0 },
    studyTime: { type: Number, default: 0 },
    physicalExerciseTime: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 },
    newWords: [{ type: String }],
  },
  { _id: false }
);

const selfCareSchema = new Schema<ISelfCare>(
  {
    sleepRating: { type: Number, min: 0, max: 5, default: 0 },
    exerciseRating: { type: Number, min: 0, max: 5, default: 0 },
    dietRating: { type: Number, min: 0, max: 5, default: 0 },
    studyTimeRating: { type: Number, min: 0, max: 5, default: 0 },
    productivityRating: { type: Number, min: 0, max: 5, default: 0 },
    selfReflection: { type: String, default: '' },
    selfReflectionRating: { type: Number, min: 0, max: 5, default: 0 },
    skillsUsed: { type: String, default: '' },
    skillsUsedRating: { type: Number, min: 0, max: 5, default: 0 },
    achievements: { type: String, default: '' },
    achievementsRating: { type: Number, min: 0, max: 5, default: 0 },
  },
  { _id: false }
);

/* ── Main schema ── */

const dailyPlannerSchema = new Schema<IDailyPlanner>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentServiceRegistration',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // Morning Log
    feeling: { type: String, default: '' },
    feelingRating: { type: Number, min: 0, max: 5, default: 0 },
    affirmation: { type: String, default: '' },

    // Today's Goal
    goalAcademic: { type: String, default: '' },
    goalNonAcademic: { type: String, default: '' },
    goalHabitFocus: { type: String, default: '' },
    goalPsychological: { type: String, default: '' },
    goalPhysical: { type: String, default: '' },
    goalReadingBooks: { type: String, default: '' },

    // Meal & sleep times
    wakeupTime: { type: String, default: '' },
    lunchTime: { type: String, default: '' },
    dinnerTime: { type: String, default: '' },
    sleepTime: { type: String, default: '' },

    // Today's Plan
    plans: {
      type: [sessionPlanSchema],
      default: () => [
        { session: 'MORNING', rows: [{ time: '', activity: '', type: '', completed: '', experience: '' }, { time: '', activity: '', type: '', completed: '', experience: '' }] },
        { session: 'AFTERNOON', rows: [{ time: '', activity: '', type: '', completed: '', experience: '' }, { time: '', activity: '', type: '', completed: '', experience: '' }] },
        { session: 'EVENING', rows: [{ time: '', activity: '', type: '', completed: '', experience: '' }, { time: '', activity: '', type: '', completed: '', experience: '' }] },
        { session: 'NIGHT', rows: [{ time: '', activity: '', type: '', completed: '', experience: '' }, { time: '', activity: '', type: '', completed: '', experience: '' }] },
      ],
    },

    // Accomplishments (blessings / happyMoment)
    blessings: { type: String, default: '' },
    blessingsRating: { type: Number, min: 0, max: 5, default: 0 },
    happyMoment: { type: String, default: '' },
    happyMomentRating: { type: Number, min: 0, max: 5, default: 0 },

    // Night Log
    nightLog: {
      type: nightLogSchema,
      default: () => ({
        mobileTime: 0,
        socialMediaTime: 0,
        studyTime: 0,
        physicalExerciseTime: 0,
        readingTime: 0,
        newWords: ['', '', '', '', ''],
      }),
    },

    // Self-Care
    selfCare: {
      type: selfCareSchema,
      default: () => ({
        sleepRating: 0,
        exerciseRating: 0,
        dietRating: 0,
        studyTimeRating: 0,
        productivityRating: 0,
        selfReflection: '',
        selfReflectionRating: 0,
        skillsUsed: '',
        skillsUsedRating: 0,
        achievements: '',
        achievementsRating: 0,
      }),
    },
  },
  { timestamps: true }
);

// One planner per student per registration per date
dailyPlannerSchema.index(
  { studentId: 1, registrationId: 1, date: 1 },
  { unique: true }
);
// Fast month queries
dailyPlannerSchema.index({ studentId: 1, registrationId: 1 });

export const DailyPlanner = model<IDailyPlanner>('DailyPlanner', dailyPlannerSchema);
