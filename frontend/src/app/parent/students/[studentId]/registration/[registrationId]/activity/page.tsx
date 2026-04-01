'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, activityAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  setMonth,
  setYear,
  getMonth,
  getYear,
  addMonths,
  addWeeks,
  addDays,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

/* ─────────── Calendar localizer ─────────── */
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

/* ─────────── Types ─────────── */
interface MonthlyFocusData {
  academicActivities: string;
  nonAcademicActivities: string;
  habitFocus: string;
  psychologicalGrooming: string;
  physicalGrooming: string;
  readingBooks: string;
}
interface PlanRow { time: string; activity: string; type: '' | 'A' | 'RB' | 'N' | 'H' | 'PS' | 'PH'; completed: 'Completed' | 'Not Started' | 'In Progress' | ''; experience: string; }
interface SessionPlan { session: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'; rows: PlanRow[]; }
interface NightLogData { mobileTime: number; socialMediaTime: number; studyTime: number; physicalExerciseTime: number; readingTime: number; newWords: string[]; }
interface SelfCareData {
  sleepRating: number; exerciseRating: number; dietRating: number; studyTimeRating: number; productivityRating: number;
  selfReflection: string; selfReflectionRating: number;
  skillsUsed: string; skillsUsedRating: number;
  achievements: string; achievementsRating: number;
}
interface DailyPlannerData {
  feeling: string; feelingRating: number; affirmation: string;
  goalAcademic: string; goalNonAcademic: string; goalHabitFocus: string; goalPsychological: string; goalPhysical: string; goalReadingBooks: string;
  wakeupTime: string; lunchTime: string; dinnerTime: string; sleepTime: string;
  plans: SessionPlan[];
  blessings: string; blessingsRating: number; happyMoment: string; happyMomentRating: number;
  nightLog: NightLogData; selfCare: SelfCareData;
}
interface DaySummary { date: string; status: 'empty' | 'partial' | 'complete'; }
interface CalendarEvent { id: string; title: string; start: Date; end: Date; status: 'partial' | 'complete'; }
interface FeedbackEntry { _id: string; type: 'monthly' | 'weekly'; period: string; periodEnd?: string; feedback: string; givenBy: string; givenByName: string; givenByRole: string; createdAt: string; }

/* ─────────── Constants ─────────── */
const DOMAINS = ['Academic', 'Non-Academic', 'Habit Focus', 'Psychological', 'Physical', 'Reading Books'] as const;

const TYPE_LEGEND = ['A – Academic', 'N – Non-Academic', 'H – Habit', 'PS – Psychological', 'PH – Physical', 'RB – Reading'];

const SESSION_ICONS: Record<string, string> = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌇', NIGHT: '🌙' };
const SESSION_FIXED: Record<string, { before?: string; after?: string }> = {
  MORNING: { before: 'WAKEUP' }, AFTERNOON: { before: 'LUNCH' }, EVENING: {}, NIGHT: { before: 'DINNER', after: 'SLEEP' },
};
const FIXED_TIME_KEYS: Record<string, keyof DailyPlannerData> = {
  WAKEUP: 'wakeupTime', LUNCH: 'lunchTime', DINNER: 'dinnerTime', SLEEP: 'sleepTime',
};

/* ─────────── Defaults ─────────── */
const emptyFocus: MonthlyFocusData = { academicActivities: '', nonAcademicActivities: '', habitFocus: '', psychologicalGrooming: '', physicalGrooming: '', readingBooks: '' };
const defaultRow = (): PlanRow => ({ time: '', activity: '', type: '', completed: '', experience: '' });
const emptyPlanner: DailyPlannerData = {
  feeling: '', feelingRating: 0, affirmation: '',
  goalAcademic: '', goalNonAcademic: '', goalHabitFocus: '', goalPsychological: '', goalPhysical: '', goalReadingBooks: '',
  wakeupTime: '', lunchTime: '', dinnerTime: '', sleepTime: '',
  plans: [
    { session: 'MORNING', rows: [defaultRow(), defaultRow()] },
    { session: 'AFTERNOON', rows: [defaultRow(), defaultRow()] },
    { session: 'EVENING', rows: [defaultRow(), defaultRow()] },
    { session: 'NIGHT', rows: [defaultRow(), defaultRow()] },
  ],
  blessings: '', blessingsRating: 0, happyMoment: '', happyMomentRating: 0,
  nightLog: { mobileTime: 0, socialMediaTime: 0, studyTime: 0, physicalExerciseTime: 0, readingTime: 0, newWords: ['', '', '', '', ''] },
  selfCare: {
    sleepRating: 0, exerciseRating: 0, dietRating: 0, studyTimeRating: 0, productivityRating: 0,
    selfReflection: '', selfReflectionRating: 0, skillsUsed: '', skillsUsedRating: 0, achievements: '', achievementsRating: 0,
  },
};

/* ─────────── Helpers ─────────── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function toYMD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function toYM(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

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

/* ── Read-only Star Rating ── */
function StarRating({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s}>
          <svg className={`${sz} transition-colors duration-200 ${s <= value ? 'text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]' : 'text-gray-300'}`}
            fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ── Read-only Duration Display ── */
function DurationDisplay({ value, label }: { value: number; label: string }) {
  const hrs = Math.floor(value / 60);
  const mins = value % 60;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 w-[250px] shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm bg-gray-50 text-gray-600">{hrs}</span>
        <span className="text-xs text-gray-400">h</span>
        <span className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm bg-gray-50 text-gray-600">{mins}</span>
        <span className="text-xs text-gray-400">m</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT (READ-ONLY – PARENT VIEW)
   ═══════════════════════════════════════════ */
function ActivityContent() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;
  const registrationId = params.registrationId as string;

  /* ── auth ── */
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  /* ── state ── */
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState<View>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(toYMD(new Date()));
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const [focus, setFocus] = useState<MonthlyFocusData>({ ...emptyFocus });
  const [focusLoaded, setFocusLoaded] = useState(false);
  const [focusOpen, setFocusOpen] = useState(true);

  const [planner, setPlanner] = useState<DailyPlannerData>(JSON.parse(JSON.stringify(emptyPlanner)));
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  /* ── feedback (read-only for parent) ── */
  const [monthlyFeedbacks, setMonthlyFeedbacks] = useState<FeedbackEntry[]>([]);
  const [weeklyFeedbacks, setWeeklyFeedbacks] = useState<FeedbackEntry[]>([]);

  const currentMonth = toYM(calDate);

  /* ── Auth check ── */
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    (async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.PARENT) {
          toast.error('Access denied.');
          router.push('/');
          return;
        }
        setAuthorized(true);
        setUser(userData);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      }
    })();
  }, [router]);

  /* ── Close calendar on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Calendar events ── */
  const calEvents: CalendarEvent[] = useMemo(() =>
    summaries.filter((s) => s.status !== 'empty').map((s) => {
      const d = new Date(s.date + 'T12:00:00');
      return { id: s.date, title: s.status === 'complete' ? '✅' : '🟡', start: d, end: d, status: s.status as 'partial' | 'complete' };
    }), [summaries]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => ({
    style: {
      backgroundColor: event.status === 'complete' ? '#DCFCE7' : '#FEF3C7',
      borderLeft: `3px solid ${event.status === 'complete' ? '#22C55E' : '#F59E0B'}`,
      color: event.status === 'complete' ? '#166534' : '#92400E',
      borderRadius: '4px', padding: '1px 4px', fontSize: '11px', fontWeight: 600,
    },
  }), []);

  /* ── Data loaders ── */
  const loadMonth = useCallback(async () => {
    try {
      const [sumRes, focusRes, fbRes] = await Promise.all([
        activityAPI.getMonthSummary(registrationId, currentMonth),
        activityAPI.getMonthlyFocus(registrationId, currentMonth),
        activityAPI.getFeedback(registrationId, 'monthly', currentMonth),
      ]);
      setSummaries(sumRes.data.data || []);
      if (focusRes.data.data) {
        const { academicActivities, nonAcademicActivities, habitFocus, psychologicalGrooming, physicalGrooming, readingBooks } = focusRes.data.data;
        setFocus({ academicActivities: academicActivities || '', nonAcademicActivities: nonAcademicActivities || '', habitFocus: habitFocus || '', psychologicalGrooming: psychologicalGrooming || '', physicalGrooming: physicalGrooming || '', readingBooks: readingBooks || '' });
      } else { setFocus({ ...emptyFocus }); }
      setFocusLoaded(true);
      setMonthlyFeedbacks(fbRes.data.data || []);
    } catch { toast.error('Failed to load month data'); setFocusLoaded(true); }
  }, [registrationId, currentMonth]);

  const loadDay = useCallback(async (dateStr: string) => {
    setPlannerLoaded(false);
    try {
      const res = await activityAPI.getDailyPlanner(registrationId, dateStr);
      if (res.data.data) {
        const d = res.data.data;
        setPlanner({
          feeling: d.feeling || '', feelingRating: d.feelingRating || 0, affirmation: d.affirmation || '',
          goalAcademic: d.goalAcademic || '', goalNonAcademic: d.goalNonAcademic || '', goalHabitFocus: d.goalHabitFocus || '', goalPsychological: d.goalPsychological || '', goalPhysical: d.goalPhysical || '', goalReadingBooks: d.goalReadingBooks || '',
          wakeupTime: d.wakeupTime || '', lunchTime: d.lunchTime || '', dinnerTime: d.dinnerTime || '', sleepTime: d.sleepTime || '',
          plans: d.plans?.length ? d.plans : emptyPlanner.plans,
          blessings: d.blessings || '', blessingsRating: d.blessingsRating || 0, happyMoment: d.happyMoment || '', happyMomentRating: d.happyMomentRating || 0,
          nightLog: d.nightLog ? { mobileTime: d.nightLog.mobileTime || 0, socialMediaTime: d.nightLog.socialMediaTime || 0, studyTime: d.nightLog.studyTime || 0, physicalExerciseTime: d.nightLog.physicalExerciseTime || 0, readingTime: d.nightLog.readingTime || 0, newWords: d.nightLog.newWords?.length ? d.nightLog.newWords : ['', '', '', '', ''] } : emptyPlanner.nightLog,
          selfCare: d.selfCare ? { sleepRating: d.selfCare.sleepRating || 0, exerciseRating: d.selfCare.exerciseRating || 0, dietRating: d.selfCare.dietRating || 0, studyTimeRating: d.selfCare.studyTimeRating || 0, productivityRating: d.selfCare.productivityRating || 0, selfReflection: d.selfCare.selfReflection || '', selfReflectionRating: d.selfCare.selfReflectionRating || 0, skillsUsed: d.selfCare.skillsUsed || '', skillsUsedRating: d.selfCare.skillsUsedRating || 0, achievements: d.selfCare.achievements || '', achievementsRating: d.selfCare.achievementsRating || 0 } : emptyPlanner.selfCare,
        });
      } else {
        setPlanner(JSON.parse(JSON.stringify(emptyPlanner)));
      }
    } catch { setPlanner(JSON.parse(JSON.stringify(emptyPlanner))); }
    setPlannerLoaded(true);
  }, [registrationId]);

  const getWeekMonday = useCallback((dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return toYMD(mon);
  }, []);

  const getWeekSunday = useCallback((mondayStr: string) => {
    const d = new Date(mondayStr + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    return toYMD(d);
  }, []);

  /* ── Load weekly feedback ── */
  const loadWeeklyFeedback = useCallback(async (dateStr: string) => {
    try {
      const monday = getWeekMonday(dateStr);
      const res = await activityAPI.getFeedback(registrationId, 'weekly', monday);
      setWeeklyFeedbacks(res.data.data || []);
    } catch { setWeeklyFeedbacks([]); }
  }, [registrationId, getWeekMonday]);

  /* ── Effects ── */
  useEffect(() => { if (authorized) loadMonth(); }, [authorized, loadMonth]);
  useEffect(() => { if (authorized && selectedDate) { loadDay(selectedDate); loadWeeklyFeedback(selectedDate); } }, [authorized, selectedDate, loadDay, loadWeeklyFeedback]);

  /* ── Calendar navigation helpers ── */
  const handleNavigate = useCallback((newDate: Date) => setCalDate(newDate), []);
  const handleMonthChange = (m: number) => setCalDate((d) => setMonth(d, m));
  const handleYearChange = (y: number) => setCalDate((d) => setYear(d, y));
  const years = Array.from({ length: 11 }, (_, i) => getYear(new Date()) - 5 + i);

  const handleCalNav = (dir: 'PREV' | 'NEXT' | 'TODAY') => {
    if (dir === 'TODAY') { setCalDate(new Date()); return; }
    const fn = dir === 'NEXT'
      ? calView === 'month' ? (d: Date) => addMonths(d, 1) : calView === 'week' ? (d: Date) => addWeeks(d, 1) : (d: Date) => addDays(d, 1)
      : calView === 'month' ? (d: Date) => addMonths(d, -1) : calView === 'week' ? (d: Date) => addWeeks(d, -1) : (d: Date) => addDays(d, -1);
    setCalDate(fn(calDate));
  };

  /* ── Tab config ── */
  const TABS = [
    { label: '🌅 Morning Log', shortLabel: '🌅' },
    { label: '📋 Today\'s Plan', shortLabel: '📋' },
    { label: '🏆 Accomplishments', shortLabel: '🏆' },
    { label: '🌙 Night Log', shortLabel: '🌙' },
    { label: '💜 Self-Care', shortLabel: '💜' },
  ];

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ParentLayout user={user!}>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-4 md:p-6 animate-fadeIn">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/parent/students/${studentId}/registration/${registrationId}`)}
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all hover:shadow-sm active:scale-95">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Activity Management</h1>
              <p className="text-xs text-gray-400">Read-only view &middot; {selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy') : 'No date selected'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold border border-blue-200">
              👁 Read Only
            </span>
            <div className="relative" ref={calRef}>
              <button onClick={() => setCalOpen(!calOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${calOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Calendar
              </button>

              {calOpen && (
                <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fadeIn overflow-hidden">
                  {/* Cal nav */}
                  <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleCalNav('PREV')}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm font-bold">‹</button>
                        <span className="text-sm font-bold text-gray-800 min-w-[120px] text-center">{MONTHS[getMonth(calDate)]} {getYear(calDate)}</span>
                        <button onClick={() => handleCalNav('NEXT')}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm font-bold">›</button>
                      </div>
                      <div className="flex items-center gap-1">
                        {(['month', 'week', 'day'] as View[]).map((v) => (
                          <button key={v} onClick={() => setCalView(v)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${calView === v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select value={getMonth(calDate)} onChange={(e) => handleMonthChange(Number(e.target.value))}
                        className="flex-1 px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white">
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select value={getYear(calDate)} onChange={(e) => handleYearChange(Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white">
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <button onClick={() => handleCalNav('TODAY')}
                        className="px-2 py-0.5 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">Today</button>
                    </div>
                  </div>
                  {/* Cal body */}
                  <div className="p-2" style={{ height: calView === 'month' ? 340 : 380 }}>
                    <Calendar
                      localizer={localizer} events={calEvents}
                      startAccessor="start" endAccessor="end"
                      view={calView} date={calDate}
                      onNavigate={handleNavigate} onView={(v) => setCalView(v)}
                      onSelectEvent={(event) => { setSelectedDate(event.id); setCalOpen(false); }}
                      onSelectSlot={({ start }) => { setSelectedDate(toYMD(start)); setCalOpen(false); }}
                      selectable
                      eventPropGetter={eventStyleGetter}
                      views={['month', 'week', 'day']} defaultView="month" popup
                      style={{ height: '100%' }} toolbar={false}
                      formats={{
                        timeGutterFormat: (date: Date) => format(date, 'HH:mm'),
                        eventTimeRangeFormat: ({ start: s, end: e }: { start: Date; end: Date }) =>
                          `${format(s, 'HH:mm')} - ${format(e, 'HH:mm')}`,
                      }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Completed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />In Progress</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Monthly Focus (Left Panel) */}
          <section className="lg:w-[40%] lg:sticky lg:top-4 lg:self-start">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => setFocusOpen(!focusOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-blue-600 hover:bg-blue-700 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-white">Monthly Focus</h2>
                    <p className="text-[10px] text-blue-100">{format(calDate, 'MMMM yyyy')}</p>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-blue-200 transition-transform ${focusOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {focusOpen && (
                <div className="p-4 border-t border-gray-100 animate-fadeIn">
                  {focusLoaded ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: 'academicActivities', label: 'Academic Activities', icon: '📚' },
                        { key: 'nonAcademicActivities', label: 'Non-Academic Activities', icon: '🎨' },
                        { key: 'habitFocus', label: 'Habit Focus', icon: '🔄' },
                        { key: 'psychologicalGrooming', label: 'Psychological Grooming', icon: '🧠' },
                        { key: 'physicalGrooming', label: 'Physical Grooming', icon: '💪' },
                        { key: 'readingBooks', label: 'Reading Books', icon: '📖' },
                      ].map(({ key, label, icon }) => (
                        <div key={key} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1"><span>{icon}</span>{label}</label>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[1.5rem]">
                            {(focus as unknown as Record<string, string>)[key] || <span className="text-gray-300 italic">No data</span>}
                          </p>
                        </div>
                      ))}
                      </div>

                      {/* Monthly Feedback Section (Read-only for parent) */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <span>💬</span> Monthly Feedback
                        </h4>
                        {monthlyFeedbacks.length > 0 ? (
                          <div className="space-y-2">
                            {monthlyFeedbacks.map((fb) => (
                              <div key={fb._id} className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-blue-700">{fb.givenByName}</span>
                                  <span className="text-[10px] text-gray-400">{format(new Date(fb.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.feedback}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No feedback yet for this month.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Daily Planner (Right Panel) */}
          <section className="lg:w-[60%]">
            {selectedDate ? (
              plannerLoaded ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-100 bg-blue-600">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📅</span> Daily Planner
                        <span className="text-xs font-normal text-blue-100">({format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy')})</span>
                      </h2>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none">
                    {TABS.map((tab, idx) => (
                      <button key={idx} onClick={() => setActiveTab(idx)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                          activeTab === idx ? 'border-blue-500 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="p-4 animate-fadeIn">

                    {/* ──── TAB 0: Morning Log (Read-only) ──── */}
                    {activeTab === 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-gray-200 p-3">
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">😊 How are you feeling?</label>
                            <div className="flex items-center gap-2">
                              <StarRating value={planner.feelingRating} size="sm" />
                              <p className="text-sm text-gray-700">{planner.feeling || <span className="text-gray-300 italic">—</span>}</p>
                            </div>
                          </div>
                          <div className="rounded-lg border border-gray-200 p-3">
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">✨ Today&apos;s Affirmation</label>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.affirmation || <span className="text-gray-300 italic">—</span>}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-gray-700 mb-3">🎯 Today&apos;s Goals</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                              { key: 'goalAcademic', label: 'Academic', icon: '📚' },
                              { key: 'goalNonAcademic', label: 'Non-Academic', icon: '🎨' },
                              { key: 'goalHabitFocus', label: 'Habit Focus', icon: '🔄' },
                              { key: 'goalPsychological', label: 'Psychological', icon: '🧠' },
                              { key: 'goalPhysical', label: 'Physical', icon: '💪' },
                              { key: 'goalReadingBooks', label: 'Reading Books', icon: '📖' },
                            ].map(({ key, label, icon }) => (
                              <div key={key} className="rounded-lg border border-gray-200 p-3">
                                <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5"><span>{icon}</span>{label}</label>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[2rem]">
                                  {(planner as unknown as Record<string, string | number>)[key] as string || <span className="text-gray-300 italic">—</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── TAB 1: Today's Plan (Read-only) ──── */}
                    {activeTab === 1 && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-gray-700">📋 Today&apos;s Plan</h3>
                          <div className="flex flex-wrap gap-1">
                            {TYPE_LEGEND.map((t) => (
                              <span key={t} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                            ))}
                          </div>
                        </div>

                        {planner.plans.map((session) => {
                          const fixed = SESSION_FIXED[session.session];
                          return (
                            <div key={session.session} className="rounded-lg border border-gray-200 overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                                <span>{SESSION_ICONS[session.session]}</span>
                                <span className="text-sm font-semibold text-gray-700">{session.session}</span>
                              </div>
                              <div className="p-3 space-y-1.5">
                                {fixed?.before && (
                                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                    <span className="text-xs text-gray-500 font-semibold uppercase w-20">{fixed.before}</span>
                                    <span className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600">
                                      {(planner as unknown as Record<string, string>)[FIXED_TIME_KEYS[fixed.before] as string] || '—'}
                                    </span>
                                  </div>
                                )}
                                {session.rows.map((row, rIdx) => (
                                  <div key={rIdx} className="flex items-start gap-1.5">
                                    <span className="w-[110px] px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 shrink-0 mt-0.5">
                                      {row.time || '—'}
                                    </span>
                                    <span className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 break-words min-w-0">
                                      {row.activity || '—'}
                                    </span>
                                    <span className="w-16 px-1 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 text-center shrink-0 mt-0.5">
                                      {row.type || '—'}
                                    </span>
                                  </div>
                                ))}
                                {fixed?.after && (
                                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                    <span className="text-xs text-gray-500 font-semibold uppercase w-20">{fixed.after}</span>
                                    <span className="px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600">
                                      {(planner as unknown as Record<string, string>)[FIXED_TIME_KEYS[fixed.after] as string] || '—'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ──── TAB 2: Accomplishments (Read-only) ──── */}
                    {activeTab === 2 && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-700">🏆 Accomplishments</h3>

                        {DOMAINS.map((domainName) => {
                          const domainRows: { sIdx: number; rIdx: number; row: PlanRow }[] = [];
                          planner.plans.forEach((session, sIdx) => {
                            session.rows.forEach((row, rIdx) => {
                              if (row.activity.trim() && row.type && typeToDomain(row.type) === domainName) {
                                domainRows.push({ sIdx, rIdx, row });
                              }
                            });
                          });
                          if (domainRows.length === 0) return null;
                          return (
                            <div key={domainName} className="rounded-lg border border-gray-200 overflow-hidden">
                              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{domainName}</span>
                                <span className="text-xs text-gray-400">{domainRows.filter(d => d.row.completed === 'Completed').length}/{domainRows.length} completed</span>
                              </div>
                              <div className="p-3 space-y-1.5">
                                <div className="grid grid-cols-[80px_1fr_100px_1fr] gap-1.5 text-xs font-semibold text-gray-400 uppercase px-0.5">
                                  <span>Session</span><span>Activity</span><span>Status</span><span>Experience</span>
                                </div>
                                {domainRows.map(({ sIdx, rIdx, row }) => (
                                  <div key={`${sIdx}-${rIdx}`} className="grid grid-cols-[80px_1fr_100px_1fr] gap-1.5">
                                    <span className="px-5 py-1.5 text-xs text-gray-500 flex items-center gap-1">
                                      <span>{SESSION_ICONS[planner.plans[sIdx].session]}</span>
                                    </span>
                                    <span className="px-2 py-1.5 border border-gray-100 rounded text-xs bg-gray-50 text-gray-600 break-words min-w-0">{row.activity}</span>
                                    <span className="px-1 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 text-center">
                                      {row.completed || '—'}
                                    </span>
                                    <span className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600">
                                      {row.experience || '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-semibold text-gray-600">✨ Blessings earned for the day!</label>
                              <StarRating size="sm" value={planner.blessingsRating} />
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.blessings || <span className="text-gray-300 italic">—</span>}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-semibold text-gray-600">😊 Happy moment of the day</label>
                              <StarRating size="sm" value={planner.happyMomentRating} />
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.happyMoment || <span className="text-gray-300 italic">—</span>}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── TAB 3: Night Log (Read-only) ──── */}
                    {activeTab === 3 && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-700">🌙 Review of the Day</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                            <h4 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">⏱ Time you spent on…</h4>
                            <DurationDisplay label="📱 Mobile / TV / Laptop" value={planner.nightLog.mobileTime} />
                            <DurationDisplay label="📲 Social Media" value={planner.nightLog.socialMediaTime} />
                            <DurationDisplay label="📖 Study*" value={planner.nightLog.studyTime} />
                            <DurationDisplay label="🏋️ Physical Exercise" value={planner.nightLog.physicalExerciseTime} />
                            <DurationDisplay label="📚 Reading" value={planner.nightLog.readingTime} />
                            <p className="text-[10px] text-gray-400 italic">*Excluding school/coaching class time</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 p-4 space-y-2.5">
                            <h4 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">📝 5 New Words Today</h4>
                            {planner.nightLog.newWords.map((word, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                                <span className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-600">
                                  {word || <span className="text-gray-300 italic">—</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── TAB 4: Self-Care (Read-only) ──── */}
                    {activeTab === 4 && (
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-700">💜 Self-Care Tracker</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                            <h4 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">⭐ Rate Your Day</h4>
                            {[
                              { key: 'sleepRating', label: '😴 Sleep', note: 'How you slept last night' },
                              { key: 'exerciseRating', label: '🏃 Exercise' },
                              { key: 'dietRating', label: '🥗 Diet' },
                              { key: 'studyTimeRating', label: '📖 Study Time' },
                              { key: 'productivityRating', label: '⚡ Productivity' },
                            ].map(({ key, label, note }) => (
                              <div key={key} className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm text-gray-700">{label}</span>
                                  {note && <p className="text-[10px] text-gray-400">{note}</p>}
                                </div>
                                <StarRating value={(planner.selfCare as unknown as Record<string, number>)[key]} />
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-lg border border-gray-200 p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-semibold text-gray-600">🪻 Self-Reflection / Self-Advice</label>
                                <StarRating size="sm" value={planner.selfCare.selfReflectionRating} />
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.selfCare.selfReflection || <span className="text-gray-300 italic">—</span>}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-semibold text-gray-600">🛠 Skills I used today</label>
                                <StarRating size="sm" value={planner.selfCare.skillsUsedRating} />
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.selfCare.skillsUsed || <span className="text-gray-300 italic">—</span>}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-semibold text-gray-600">🏅 My Achievements</label>
                                <StarRating size="sm" value={planner.selfCare.achievementsRating} />
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{planner.selfCare.achievements || <span className="text-gray-300 italic">—</span>}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ──── Weekly Feedback Section (Read-only for parent) ──── */}
                    {selectedDate && (() => {
                      const monday = getWeekMonday(selectedDate);
                      const sunday = getWeekSunday(monday);
                      return (
                        <div className="mt-5 pt-4 border-t-2 border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">📝</span>
                            <div>
                              <h3 className="text-sm font-bold text-gray-800">Weekly Feedback</h3>
                              <p className="text-[10px] text-gray-400">
                                {format(new Date(monday + 'T12:00:00'), 'MMM d')} – {format(new Date(sunday + 'T12:00:00'), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>

                          {weeklyFeedbacks.length > 0 ? (
                            <div className="space-y-2">
                              {weeklyFeedbacks.map((fb) => (
                                <div key={fb._id} className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-blue-700">{fb.givenByName}</span>
                                    <span className="text-[10px] text-gray-400">{format(new Date(fb.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.feedback}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No weekly feedback yet.</p>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-20">
                <span className="text-5xl mb-3">📅</span>
                <p className="text-gray-500 font-semibold text-lg">Select a date</p>
                <p className="text-gray-400 text-sm mt-1">Click the Calendar button above to pick a day</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Animations + Calendar CSS overrides */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

        .rbc-month-view { border: none !important; border-radius: 8px; overflow: hidden; }
        .rbc-header { background: #F9FAFB; border-bottom: 1px solid #E5E7EB !important; padding: 6px 2px !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase; color: #6B7280; }
        .rbc-date-cell { padding: 3px 4px !important; font-size: 11px; font-weight: 600; }
        .rbc-today { background: #EEF2F9 !important; }
        .rbc-off-range-bg { background: #FAFAFA !important; }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #F3F4F6 !important; }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid #F3F4F6 !important; }
        .rbc-event { border-radius: 4px !important; margin: 1px 2px !important; }
        .rbc-event:focus { outline: 2px solid #2563EB !important; outline-offset: 1px; }
        .rbc-show-more { color: #2563EB !important; font-weight: 600 !important; font-size: 10px !important; }
        .rbc-day-bg:hover { background: #EFF6FF !important; cursor: pointer; }
        .rbc-time-view { border: none !important; }
        .rbc-month-view .rbc-month-row { min-height: 50px; }
      `}</style>
    </ParentLayout>
  );
}

export default function StudentActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading Activity Management...</p>
        </div>
      </div>
    }>
      <ActivityContent />
    </Suspense>
  );
}
