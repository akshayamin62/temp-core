import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MonthlyFocus } from '../models/MonthlyFocus';
import { DailyPlanner } from '../models/DailyPlanner';
import Student from '../models/Student';

/* ─────────── helpers ─────────── */

const getStudentId = async (userId: string) => {
  const student = await Student.findOne({ userId });
  return student?._id?.toString() ?? null;
};

const DOMAINS = ['Academic', 'Non-Academic', 'Habit Focus', 'Psychological', 'Physical', 'Reading Books'] as const;

function typeToDomain(type: string): string {
  switch (type) {
    case 'A': return 'Academic';
    case 'RB': return 'Reading Books';
    case 'N': return 'Non-Academic';
    case 'H': return 'Habit Focus';
    case 'PS': return 'Psychological';
    case 'PH': return 'Physical';
    default: return 'Academic';
  }
}

/* ═══════════════════════════════
   MONTHLY FOCUS
   ═══════════════════════════════ */

/** GET  /api/activity/:registrationId/monthly-focus?month=YYYY-MM */
export const getMonthlyFocus = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    const focus = await MonthlyFocus.findOne({ studentId, registrationId, month });
    return res.json({ success: true, data: focus });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT  /api/activity/:registrationId/monthly-focus */
export const upsertMonthlyFocus = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const { month, academicActivities, nonAcademicActivities, habitFocus, psychologicalGrooming, physicalGrooming, readingBooks } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Invalid month format (expected YYYY-MM)' });
    }

    const focus = await MonthlyFocus.findOneAndUpdate(
      { studentId, registrationId, month },
      {
        studentId,
        registrationId,
        month,
        academicActivities,
        nonAcademicActivities,
        habitFocus,
        psychologicalGrooming,
        physicalGrooming,
        readingBooks,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: focus });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════
   DAILY PLANNER
   ═══════════════════════════════ */

/** GET  /api/activity/:registrationId/planner?date=YYYY-MM-DD */
export const getDailyPlanner = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date (expected YYYY-MM-DD)' });
    }

    const planner = await DailyPlanner.findOne({ studentId, registrationId, date });
    return res.json({ success: true, data: planner });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT  /api/activity/:registrationId/planner */
export const upsertDailyPlanner = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const { date, ...fields } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date (expected YYYY-MM-DD)' });
    }

    const planner = await DailyPlanner.findOneAndUpdate(
      { studentId, registrationId, date },
      { studentId, registrationId, date, ...fields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: planner });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** GET  /api/activity/:registrationId/month-summary?month=YYYY-MM
 *  Returns list of dates and a fill-status for each day.
 */
export const getMonthSummary = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    const regex = new RegExp(`^${month}-`);
    const planners = await DailyPlanner.find(
      { studentId, registrationId, date: { $regex: regex } },
      { date: 1, feeling: 1, plans: 1, nightLog: 1, selfCare: 1 }
    ).lean();

    const summary = planners.map((p) => {
      let filled = 0;
      let total = 5;
      if (p.feeling || p.affirmation || p.goalAcademic) filled++;
      const hasPlans = p.plans?.some((s: any) => s.rows?.some((r: any) => r.activity));
      if (hasPlans) filled++;
      const hasAccomp = p.plans?.some((s: any) => s.rows?.some((r: any) => r.activity && r.completed));
      if (hasAccomp) filled++;
      const nlKeys: (keyof typeof p.nightLog)[] = ['mobileTime', 'socialMediaTime', 'studyTime', 'physicalExerciseTime', 'readingTime'];
      const hasNight = p.nightLog && nlKeys.some((k) => (p.nightLog as any)[k] > 0);
      if (hasNight) filled++;
      const scKeys = ['sleepRating', 'exerciseRating', 'dietRating', 'studyTimeRating', 'productivityRating'];
      const hasSC = p.selfCare && scKeys.some((k) => (p.selfCare as any)[k] > 0);
      if (hasSC) filled++;

      let status: 'empty' | 'partial' | 'complete' = 'empty';
      if (filled === total) status = 'complete';
      else if (filled > 0) status = 'partial';

      return { date: p.date, status, filled, total };
    });

    return res.json({ success: true, data: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════
   ACTIVITY ANALYTICS
   ═══════════════════════════════ */

/** GET  /api/activity/:registrationId/analytics?months=3
 *  Returns comprehensive analytics for the student's activity data.
 */
export const getActivityAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = await getStudentId(req.user!.userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const { registrationId } = req.params;
    const months = Math.min(parseInt(req.query.months as string) || 3, 60); // up to 5 years

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch all planners in range
    const planners = await DailyPlanner.find({
      studentId,
      registrationId,
      date: { $gte: startStr },
    }).lean();

    // --- LIFETIME STREAK (all planners, no date filter) ---
    const allPlanners = await DailyPlanner.find(
      { studentId, registrationId },
      { date: 1 }
    ).lean();
    const allSortedDates = allPlanners.map((p: any) => p.date).sort();
    let lifetimeLongestStreak = 0;
    if (allSortedDates.length > 0) {
      let sc = 1;
      lifetimeLongestStreak = 1;
      for (let i = 1; i < allSortedDates.length; i++) {
        const prev = new Date(allSortedDates[i - 1] + 'T00:00:00');
        const curr = new Date(allSortedDates[i] + 'T00:00:00');
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          sc++;
          if (sc > lifetimeLongestStreak) lifetimeLongestStreak = sc;
        } else {
          sc = 1;
        }
      }
    }

    // --- 1. COMPLETION BY DATE ---
    const completionByDate = planners.map((p: any) => {
      let planned = 0;
      let completed = 0;
      let partial = 0;

      for (const session of (p.plans || [])) {
        for (const row of session.rows || []) {
          if (row.activity?.trim() && row.type) {
            planned++;
            if (row.completed === 'Completed') completed++;
            else if (row.completed === 'In Progress') partial++;
          }
        }
      }

      return { date: p.date, planned, completed, partial };
    }).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // --- 2. DOMAIN BALANCE ---
    const domainBalance: Record<string, { planned: number; completed: number }> = {};
    for (const d of DOMAINS) domainBalance[d] = { planned: 0, completed: 0 };

    for (const p of planners as any[]) {
      for (const session of (p.plans || [])) {
        for (const row of session.rows || []) {
          if (row.activity?.trim() && row.type) {
            const domain = typeToDomain(row.type);
            domainBalance[domain].planned++;
            if (row.completed === 'Completed') {
              domainBalance[domain].completed++;
            }
          }
        }
      }
    }

    // --- 3. MOOD & RATING TRENDS ---
    const moodTrend = planners
      .filter((p: any) => p.feelingRating > 0 || (p.selfCare && Object.values(p.selfCare).some((v: any) => typeof v === 'number' && v > 0)))
      .map((p: any) => ({
        date: p.date,
        feeling: p.feelingRating || 0,
        sleep: p.selfCare?.sleepRating || 0,
        exercise: p.selfCare?.exerciseRating || 0,
        diet: p.selfCare?.dietRating || 0,
        study: p.selfCare?.studyTimeRating || 0,
        productivity: p.selfCare?.productivityRating || 0,
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // --- 4. TIME ALLOCATION ---
    const timeAllocation = planners
      .filter((p: any) => p.nightLog && (p.nightLog.mobileTime > 0 || p.nightLog.studyTime > 0 || p.nightLog.readingTime > 0))
      .map((p: any) => ({
        date: p.date,
        mobile: p.nightLog?.mobileTime || 0,
        socialMedia: p.nightLog?.socialMediaTime || 0,
        study: p.nightLog?.studyTime || 0,
        exercise: p.nightLog?.physicalExerciseTime || 0,
        reading: p.nightLog?.readingTime || 0,
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // --- 5. STREAK ---
    let currentStreak = 0;

    // Check from today backwards for current streak
    const dateSet = new Set(allSortedDates); // use ALL dates for current streak
    const checkDate = new Date(now);
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (dateSet.has(ds)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // --- 6. WORD COUNT ---
    let totalWords = 0;
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let thisMonthWords = 0;
    for (const p of planners as any[]) {
      const words = (p.nightLog?.newWords || []).filter((w: string) => w && w.trim());
      totalWords += words.length;
      if (p.date.startsWith(currentMonthStr)) thisMonthWords += words.length;
    }

    // --- 7. HEATMAP (day fill status for all days) ---
    const heatmap = planners.map((p: any) => {
      let filled = 0;
      if (p.feeling || p.affirmation || p.goalAcademic) filled++;
      const hasPlans = p.plans?.some((s: any) => s.rows?.some((r: any) => r.activity?.trim()));
      if (hasPlans) filled++;
      const hasAccomp = p.plans?.some((s: any) => s.rows?.some((r: any) => r.activity?.trim() && r.completed));
      if (hasAccomp) filled++;
      const nlKeys = ['mobileTime', 'socialMediaTime', 'studyTime', 'physicalExerciseTime', 'readingTime'];
      const hasNight = p.nightLog && nlKeys.some((k: any) => (p.nightLog as any)[k] > 0);
      if (hasNight) filled++;
      const scKeys = ['sleepRating', 'exerciseRating', 'dietRating', 'studyTimeRating', 'productivityRating'];
      const hasSC = p.selfCare && scKeys.some((k: any) => (p.selfCare as any)[k] > 0);
      if (hasSC) filled++;

      return {
        date: p.date,
        status: filled >= 5 ? 'complete' : filled > 0 ? 'partial' : 'empty',
        filled,
      };
    }).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // --- 8. SELF-CARE AVERAGE ---
    const scPlanners = planners.filter((p: any) => p.selfCare);
    const selfCareAvg = {
      sleep: 0, exercise: 0, diet: 0, study: 0, productivity: 0,
    };
    if (scPlanners.length > 0) {
      for (const p of scPlanners as any[]) {
        selfCareAvg.sleep += p.selfCare?.sleepRating || 0;
        selfCareAvg.exercise += p.selfCare?.exerciseRating || 0;
        selfCareAvg.diet += p.selfCare?.dietRating || 0;
        selfCareAvg.study += p.selfCare?.studyTimeRating || 0;
        selfCareAvg.productivity += p.selfCare?.productivityRating || 0;
      }
      const len = scPlanners.length;
      selfCareAvg.sleep = Math.round((selfCareAvg.sleep / len) * 10) / 10;
      selfCareAvg.exercise = Math.round((selfCareAvg.exercise / len) * 10) / 10;
      selfCareAvg.diet = Math.round((selfCareAvg.diet / len) * 10) / 10;
      selfCareAvg.study = Math.round((selfCareAvg.study / len) * 10) / 10;
      selfCareAvg.productivity = Math.round((selfCareAvg.productivity / len) * 10) / 10;
    }

    return res.json({
      success: true,
      data: {
        completionByDate,
        domainBalance,
        moodTrend,
        timeAllocation,
        streak: { current: currentStreak, longest: lifetimeLongestStreak, totalDays: planners.length },
        wordCount: { total: totalWords, thisMonth: thisMonthWords },
        heatmap,
        selfCareAvg,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
