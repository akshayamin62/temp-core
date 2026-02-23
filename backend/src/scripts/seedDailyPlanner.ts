import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DailyPlanner } from '../models/DailyPlanner';

dotenv.config();

const STUDENT_ID = '6992af34b9267af8e36b1aca';
const REGISTRATION_ID = '6996f851b6b5eddfcf189dc2';

/* ── Random helpers ── */
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randTime = (hStart: number, hEnd: number) => {
  const h = rand(hStart, hEnd);
  const m = pick([0, 15, 30, 45]);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const ACTIVITIES = {
  A: ['Math practice', 'Physics problems', 'Chemistry revision', 'English essay writing', 'Biology chapter notes', 'History reading', 'Geography maps'],
  RB: ['Read "Atomic Habits"', 'Read "Sapiens" chapter', 'Read newspaper articles', 'Read "The Alchemist"', 'Read science magazine'],
  N: ['Guitar practice', 'Painting session', 'Photography walk', 'Cooking new recipe', 'Chess puzzles', 'Coding project'],
  H: ['Morning meditation', 'Journaling', 'No phone first hour', 'Drink 8 glasses water', 'Gratitude practice', 'Early morning walk'],
  PS: ['Deep breathing', 'Positive self-talk', 'Visualization exercise', 'Mindfulness session', 'Stress management'],
  PH: ['Running 3km', 'Yoga session', 'Push-ups & squats', 'Cycling', 'Stretching routine', 'Swimming'],
};

const TYPES = ['A', 'RB', 'N', 'H', 'PS', 'PH'] as const;
const SESSIONS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const;
const SESSION_TIME_RANGES: Record<string, [number, number]> = {
  MORNING: [6, 11],
  AFTERNOON: [12, 16],
  EVENING: [17, 20],
  NIGHT: [20, 23],
};

const FEELINGS = [
  '• Feeling energized and ready to go!',
  '• A bit tired but motivated',
  '• Calm and focused this morning',
  '• Excited about today\'s plans',
  '• Refreshed after good sleep',
  '• Slightly anxious but determined',
];

const AFFIRMATIONS = [
  '• I will stay focused and productive today',
  '• Every step forward counts, no matter how small',
  '• I am capable of achieving my goals',
  '• Today I choose growth over comfort',
  '• I will make the most of this day',
];

const BLESSINGS = [
  '• Grateful for supportive family',
  '• Thankful for good health',
  '• Blessed to have great friends',
  '• Grateful for access to education',
  '• Thankful for a new day to learn',
];

const HAPPY_MOMENTS = [
  '• Had a great study session with friends',
  '• Solved a difficult math problem!',
  '• Mom made my favorite food',
  '• Got positive feedback from teacher',
  '• Beautiful sunset on evening walk',
];

const WORDS = [
  'ephemeral', 'ubiquitous', 'paradigm', 'juxtapose', 'eloquent',
  'pragmatic', 'resilient', 'meticulous', 'serendipity', 'catalyst',
  'ambiguous', 'benevolent', 'candid', 'diligent', 'empathy',
  'fortitude', 'gregarious', 'hypothesis', 'impeccable', 'kinetic',
  'lucid', 'magnanimous', 'nuance', 'omnipotent', 'perseverance',
  'quintessential', 'rhetoric', 'sustain', 'tenacious', 'verbose',
  'wistful', 'aesthetic', 'anomaly', 'cognizant', 'divergent',
  'equilibrium', 'frugal', 'galvanize', 'harbinger', 'immutable',
  'juxtaposition', 'kinesthetic', 'luminous', 'metamorphosis', 'nascent',
  'oscillate', 'permeate', 'quandary', 'recalcitrant', 'sagacious',
];

const REFLECTIONS = [
  '• Today I learned the importance of time management',
  '• I need to be more patient with difficult subjects',
  '• Realized that consistency beats intensity',
  '• Should balance study with breaks better tomorrow',
  '• Proud of sticking to my plan despite distractions',
];

const SKILLS = [
  '• Problem-solving in math exercises',
  '• Critical thinking while reading',
  '• Time management and prioritization',
  '• Communication during group study',
  '• Self-discipline by avoiding social media',
];

const ACHIEVEMENTS = [
  '• Completed all planned activities',
  '• Finished 2 chapters ahead of schedule',
  '• Exercised for 30 minutes without giving up',
  '• Read 20 pages of my book',
  '• Stayed focused during study time',
];

function generateDay(date: string) {
  const completedOptions = ['Yes', 'No', 'Partial', ''] as const;
  const experiences = ['Great session!', 'Could be better', 'Loved it', 'Challenging but worth it', 'Need more practice', 'Very productive'];

  const makePlanRows = (session: string, count: number) => {
    const [hStart, hEnd] = SESSION_TIME_RANGES[session];
    return Array.from({ length: count }, () => {
      const type = pick(TYPES);
      const activity = pick(ACTIVITIES[type]);
      const completed = pick(completedOptions);
      return {
        time: randTime(hStart, hEnd),
        activity,
        type,
        completed,
        experience: completed ? pick(experiences) : '',
      };
    });
  };

  return {
    studentId: new mongoose.Types.ObjectId(STUDENT_ID),
    registrationId: new mongoose.Types.ObjectId(REGISTRATION_ID),
    date,

    feeling: pick(FEELINGS),
    feelingRating: rand(2, 5),
    affirmation: pick(AFFIRMATIONS),

    goalAcademic: '• Complete math and physics revision',
    goalNonAcademic: '• Practice guitar for 30 mins',
    goalHabitFocus: '• Meditate for 10 minutes',
    goalPsychological: '• Stay positive throughout the day',
    goalPhysical: '• Go for a 20-minute run',
    goalReadingBooks: '• Read at least 15 pages',

    wakeupTime: randTime(5, 7),
    lunchTime: randTime(12, 13),
    dinnerTime: randTime(19, 20),
    sleepTime: randTime(22, 23),

    plans: SESSIONS.map((session) => ({
      session,
      rows: makePlanRows(session, rand(2, 4)),
    })),

    blessings: pick(BLESSINGS),
    blessingsRating: rand(3, 5),
    happyMoment: pick(HAPPY_MOMENTS),
    happyMomentRating: rand(3, 5),

    nightLog: {
      mobileTime: rand(30, 180),
      socialMediaTime: rand(15, 90),
      studyTime: rand(60, 240),
      physicalExerciseTime: rand(0, 60),
      readingTime: rand(15, 60),
      newWords: Array.from({ length: 5 }, () => pick(WORDS)),
    },

    selfCare: {
      sleepRating: rand(2, 5),
      exerciseRating: rand(1, 5),
      dietRating: rand(2, 5),
      studyTimeRating: rand(2, 5),
      productivityRating: rand(2, 5),
      selfReflection: pick(REFLECTIONS),
      selfReflectionRating: rand(2, 5),
      skillsUsed: pick(SKILLS),
      skillsUsedRating: rand(2, 5),
      achievements: pick(ACHIEVEMENTS),
      achievementsRating: rand(2, 5),
    },
  };
}

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not found in .env');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Pick 10 random unique days in February 2026
  const allDays = Array.from({ length: 28 }, (_, i) => i + 1);
  const shuffled = allDays.sort(() => Math.random() - 0.5);
  const selectedDays = shuffled.slice(0, 15).sort((a, b) => a - b);

  console.log(`Seeding 10 daily planners for February 2026: days ${selectedDays.join(', ')}`);

  for (const day of selectedDays) {
    const dateStr = `2025-05-${String(day).padStart(2, '0')}`;
    const data = generateDay(dateStr);

    await DailyPlanner.findOneAndUpdate(
      { studentId: data.studentId, registrationId: data.registrationId, date: dateStr },
      data,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${dateStr}`);
  }

  console.log('\nDone! Seeded 10 daily planners for February 2026.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
