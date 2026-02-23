'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { activityAPI } from '@/lib/api';
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
interface PlanRow { time: string; activity: string; type: '' | 'A' | 'RB' | 'N' | 'H' | 'PS' | 'PH'; completed: 'Yes' | 'No' | 'Partial' | ''; experience: string; }
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

/* ─────────── Constants ─────────── */
const DOMAINS = ['Academic', 'Reading Books', 'Non-Academic', 'Habit Focus', 'Psychological', 'Physical'] as const;

const TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'A', label: 'A' },
  { value: 'RB', label: 'RB' },
  { value: 'N', label: 'N' },
  { value: 'H', label: 'H' },
  { value: 'PS', label: 'PS' },
  { value: 'PH', label: 'PH' },
];
const TYPE_LEGEND = ['A – Academic', 'RB – Reading', 'N – Non-Academic', 'H – Habit', 'PS – Psychological', 'PH – Physical'];

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

/** Auto-bullet: prefix each non-empty line with • */
function bulletFormat(raw: string): string {
  // If nothing remains after stripping all bullet chars and whitespace, return empty
  if (!raw.replace(/[•\-*\s]/g, '')) return '';
  return raw.split('\n').map((line, idx, arr) => {
    const stripped = line.replace(/^[\s•\-*]+/, '').trim();
    if (!stripped && idx === arr.length - 1) return '• ';
    if (!stripped) return '';
    return `• ${stripped}`;
  }).join('\n');
}

/** True only when the string has real content beyond bullet symbols/whitespace */
function hasContent(s: string): boolean {
  return s.replace(/[•\-*\s]/g, '').length > 0;
}

/* ── Star Rating ── */
function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(value === s ? 0 : s)}
          className="transition-transform duration-150 hover:scale-125 active:scale-90">
          <svg className={`${sz} transition-colors duration-200 ${s <= value ? 'text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]' : 'text-gray-300 hover:text-yellow-200'}`}
            fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* ── Duration Input (Night Log) ── */
function DurationInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const hrs = Math.floor(value / 60);
  const mins = value % 60;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 w-[250px] shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input type="number" min={0} max={24} value={hrs}
          onChange={(e) => onChange(Number(e.target.value) * 60 + mins)}
          className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-brand-300 focus:border-brand-400 outline-none transition-all" />
        <span className="text-xs text-gray-400">h</span>
        <input type="number" min={0} max={59} value={mins}
          onChange={(e) => onChange(hrs * 60 + Number(e.target.value))}
          className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-brand-300 focus:border-brand-400 outline-none transition-all" />
        <span className="text-xs text-gray-400">m</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
function ActivityContent() {
  const router = useRouter();
  const params = useParams();
  const registrationId = params.registrationId as string;

  /* ── state ── */
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState<View>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(toYMD(new Date()));
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const [focus, setFocus] = useState<MonthlyFocusData>({ ...emptyFocus });
  const [focusEditing, setFocusEditing] = useState(false);
  const [focusLoaded, setFocusLoaded] = useState(false);
  const [focusSaving, setFocusSaving] = useState(false);
  const [focusOpen, setFocusOpen] = useState(true);

  const [planner, setPlanner] = useState<DailyPlannerData>(JSON.parse(JSON.stringify(emptyPlanner)));
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [plannerSaving, setPlannerSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const currentMonth = toYM(calDate);

  /* ── Close calendar on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    if (calOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calOpen]);

  /* ── Calendar events ── */
  const calEvents: CalendarEvent[] = useMemo(() => {
    return summaries.filter((s) => s.status !== 'empty').map((s) => {
      const d = new Date(s.date + 'T12:00:00');
      return { id: s.date, title: s.status === 'complete' ? '✅' : '🔶', start: d, end: d, status: s.status as 'partial' | 'complete' };
    });
  }, [summaries]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => ({
    style: {
      backgroundColor: event.status === 'complete' ? '#DCFCE7' : '#FEF3C7',
      borderLeft: `3px solid ${event.status === 'complete' ? '#22C55E' : '#F59E0B'}`,
      color: event.status === 'complete' ? '#166534' : '#92400E',
      borderRadius: '4px', padding: '1px 4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
    },
  }), []);

  /* ── Load month data ── */
  const loadMonth = useCallback(async () => {
    try {
      const [fRes, sRes] = await Promise.all([
        activityAPI.getMonthlyFocus(registrationId, currentMonth),
        activityAPI.getMonthSummary(registrationId, currentMonth),
      ]);
      if (fRes.data.data) {
        const d = fRes.data.data;
        setFocus({
          academicActivities: d.academicActivities || '', nonAcademicActivities: d.nonAcademicActivities || '',
          habitFocus: d.habitFocus || '', psychologicalGrooming: d.psychologicalGrooming || '',
          physicalGrooming: d.physicalGrooming || '', readingBooks: d.readingBooks || '',
        });
        setFocusEditing(false);
      } else {
        setFocus({ ...emptyFocus });
        setFocusEditing(true);
      }
      setFocusLoaded(true);
      setSummaries(sRes.data.data || []);
    } catch { toast.error('Failed to load activity data'); }
  }, [registrationId, currentMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  /* ── Load day planner ── */
  const loadDay = useCallback(async (date: string) => {
    setPlannerLoaded(false);
    try {
      const res = await activityAPI.getDailyPlanner(registrationId, date);
      if (res.data.data) {
        const d = res.data.data;
        setPlanner({
          feeling: d.feeling || '', feelingRating: d.feelingRating || 0, affirmation: d.affirmation || '',
          goalAcademic: d.goalAcademic || '', goalNonAcademic: d.goalNonAcademic || '',
          goalHabitFocus: d.goalHabitFocus || '', goalPsychological: d.goalPsychological || '', goalPhysical: d.goalPhysical || '',
          goalReadingBooks: d.goalReadingBooks || '',
          wakeupTime: d.wakeupTime || '', lunchTime: d.lunchTime || '', dinnerTime: d.dinnerTime || '', sleepTime: d.sleepTime || '',
          plans: d.plans?.length ? d.plans : JSON.parse(JSON.stringify(emptyPlanner.plans)),
          blessings: d.blessings || '', blessingsRating: d.blessingsRating || 0,
          happyMoment: d.happyMoment || '', happyMomentRating: d.happyMomentRating || 0,
          nightLog: d.nightLog || JSON.parse(JSON.stringify(emptyPlanner.nightLog)),
          selfCare: { ...JSON.parse(JSON.stringify(emptyPlanner.selfCare)), ...(d.selfCare || {}) },
        });
      } else {
        setPlanner(JSON.parse(JSON.stringify(emptyPlanner)));
      }
    } catch {
      setPlanner(JSON.parse(JSON.stringify(emptyPlanner)));
    }
    setPlannerLoaded(true);
    setSaveAttempted(false);
    setActiveTab(0);
  }, [registrationId]);

  useEffect(() => { if (selectedDate) loadDay(selectedDate); }, [selectedDate, loadDay]);

  /* ── Save focus ── */
  const saveFocus = async () => {
    setFocusSaving(true);
    try {
      await activityAPI.upsertMonthlyFocus(registrationId, { month: currentMonth, ...focus });
      toast.success('Monthly focus saved!');
      setFocusEditing(false);
    } catch { toast.error('Failed to save'); }
    setFocusSaving(false);
  };

  /* ── Field pair validation (text + star rating must both be filled or both empty) ── */
  const isFieldError = (key: string): boolean => {
    if (!saveAttempted) return false;
    switch (key) {
      case 'feeling':        return hasContent(planner.feeling) !== !!planner.feelingRating;
      case 'blessings':      return hasContent(planner.blessings) !== !!planner.blessingsRating;
      case 'happyMoment':    return hasContent(planner.happyMoment) !== !!planner.happyMomentRating;
      case 'selfReflection': return hasContent(planner.selfCare.selfReflection) !== !!planner.selfCare.selfReflectionRating;
      case 'skillsUsed':     return hasContent(planner.selfCare.skillsUsed) !== !!planner.selfCare.skillsUsedRating;
      case 'achievements':   return hasContent(planner.selfCare.achievements) !== !!planner.selfCare.achievementsRating;
      default: return false;
    }
  };

  /* ── Save planner (with validation: only save complete plan rows) ── */
  const savePlanner = async () => {
    if (!selectedDate) return;
    setSaveAttempted(true);

    // Validate: text+rating pairs must be all-or-nothing
    const pairs = [
      { key: 'feeling',        label: 'How am I feeling this morning?', filled: hasContent(planner.feeling),                   rating: planner.feelingRating,                 tab: 0 },
      { key: 'blessings',      label: 'Blessings earned for the day!',  filled: hasContent(planner.blessings),                 rating: planner.blessingsRating,               tab: 2 },
      { key: 'happyMoment',    label: 'Happy moment of the day',        filled: hasContent(planner.happyMoment),               rating: planner.happyMomentRating,             tab: 2 },
      { key: 'selfReflection', label: 'Self-Reflection / Self-Advice',  filled: hasContent(planner.selfCare.selfReflection),   rating: planner.selfCare.selfReflectionRating, tab: 4 },
      { key: 'skillsUsed',     label: 'Skills I used today',            filled: hasContent(planner.selfCare.skillsUsed),       rating: planner.selfCare.skillsUsedRating,     tab: 4 },
      { key: 'achievements',   label: 'My Achievements',                filled: hasContent(planner.selfCare.achievements),     rating: planner.selfCare.achievementsRating,   tab: 4 },
    ];
    const firstError = pairs.find((p) => (p.filled && !p.rating) || (!p.filled && p.rating));
    if (firstError) {
      const msg = !firstError.filled
        ? `Please add a star rating for "${firstError.label}"`
        : `Please fill in text for "${firstError.label}"`;
      toast.error(msg, { duration: 4000 });
      setActiveTab(firstError.tab);
      return;
    }

    setPlannerSaving(true);
    try {
      // Filter plan rows: only keep rows where all 3 fields are filled
      const filteredPlans = planner.plans.map((session) => ({
        ...session,
        rows: session.rows.filter((r) => r.time.trim() && r.activity.trim() && r.type !== ''),
      }));
      await activityAPI.upsertDailyPlanner(registrationId, { date: selectedDate, ...planner, plans: filteredPlans });
      toast.success('All changes saved!');
      const res = await activityAPI.getMonthSummary(registrationId, currentMonth);
      setSummaries(res.data.data || []);
    } catch { toast.error('Failed to save'); }
    setPlannerSaving(false);
  };

  /* ── Calendar nav ── */
  const handlePrevious = useCallback(() => {
    if (calView === 'month') setCalDate((d) => addMonths(d, -1));
    else if (calView === 'week') setCalDate((d) => addWeeks(d, -1));
    else setCalDate((d) => addDays(d, -1));
  }, [calView]);
  const handleNext = useCallback(() => {
    if (calView === 'month') setCalDate((d) => addMonths(d, 1));
    else if (calView === 'week') setCalDate((d) => addWeeks(d, 1));
    else setCalDate((d) => addDays(d, 1));
  }, [calView]);

  /* ── Plan helpers ── */
  const updatePlan = (sIdx: number, rIdx: number, field: keyof PlanRow, val: string) => {
    setPlanner((p) => ({ ...p, plans: p.plans.map((s, si) => si !== sIdx ? s : { ...s, rows: s.rows.map((r, ri) => ri !== rIdx ? r : { ...r, [field]: val }) }) }));
  };
  const addPlanRow = (sIdx: number) => {
    setPlanner((p) => ({ ...p, plans: p.plans.map((s, si) => si !== sIdx ? s : { ...s, rows: [...s.rows, defaultRow()] }) }));
  };
  const removePlanRow = (sIdx: number, rIdx: number) => {
    setPlanner((p) => ({ ...p, plans: p.plans.map((s, si) => si !== sIdx ? s : { ...s, rows: s.rows.filter((_, ri) => ri !== rIdx) }) }));
  };

  /* ── Generic bullet handler for any planner text field ── */
  const handleBulletPlanner = (key: string, raw: string) => {
    setPlanner((p) => ({ ...p, [key]: bulletFormat(raw) }));
  };
  const handleBulletSelfCare = (key: string, raw: string) => {
    setPlanner((p) => ({ ...p, selfCare: { ...p.selfCare, [key]: bulletFormat(raw) } }));
  };

  /* ── Tab config ── */
  const tabs = [
    { label: 'Morning Log', icon: '🌅' },
    { label: "Today's Plan", icon: '📋' },
    { label: 'Accomplishments', icon: '🏆' },
    { label: 'Night Log', icon: '🌙' },
    { label: 'Self-Care', icon: '💜' },
  ];

  const calMonth = getMonth(calDate);
  const calYear = getYear(calDate);
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  /* ── Focus field config ── */
  const focusFields = [
    { key: 'academicActivities', label: 'Academic Activities', icon: '📚' },
    { key: 'nonAcademicActivities', label: 'Non-Academic Activities', icon: '🎨' },
    { key: 'habitFocus', label: 'Habit Focus', icon: '🔄' },
    { key: 'psychologicalGrooming', label: 'Psychological Grooming', icon: '🧠' },
    { key: 'physicalGrooming', label: 'Physical Grooming', icon: '💪' },
    { key: 'readingBooks', label: 'Reading Books', icon: '📖' },
  ];

  /* ═══════ RENDER ═══════ */
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-5 sm:px-8 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/student/registration/${registrationId}`)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">Activity Management</h1>
            {selectedDate && (
              <span className="text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full hidden sm:inline">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Right: Calendar toggle */}
          <div className="relative" ref={calRef}>
            <button onClick={() => setCalOpen(!calOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${calOpen ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Calendar
            </button>

            {/* Calendar dropdown */}
            {calOpen && (
              <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fadeIn overflow-hidden">
                {/* Cal nav */}
                <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={handlePrevious}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm font-bold">‹</button>
                      <span className="text-sm font-bold text-gray-800 min-w-[120px] text-center">{MONTHS[calMonth]} {calYear}</span>
                      <button onClick={handleNext}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm font-bold">›</button>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['month', 'week', 'day'] as View[]).map((v) => (
                        <button key={v} onClick={() => setCalView(v)}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${calView === v ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select value={calMonth} onChange={(e) => setCalDate(setMonth(calDate, +e.target.value))}
                      className="flex-1 px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white">
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={calYear} onChange={(e) => setCalDate(setYear(calDate, +e.target.value))}
                      className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white">
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={() => { setCalDate(new Date()); setCalView('month'); }}
                      className="px-2 py-0.5 text-[11px] font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100">Today</button>
                  </div>
                </div>
                {/* Cal body */}
                <div className="p-2" style={{ height: calView === 'month' ? 340 : 380 }}>
                  <Calendar
                    localizer={localizer} events={calEvents}
                    startAccessor="start" endAccessor="end"
                    view={calView} date={calDate}
                    onNavigate={(d) => setCalDate(d)} onView={(v) => setCalView(v)}
                    onSelectEvent={(e) => { setSelectedDate((e as CalendarEvent).id); setCalOpen(false); }}
                    onSelectSlot={({ start }) => { setSelectedDate(toYMD(start)); setCalOpen(false); }}
                    selectable
                    eventPropGetter={(e) => eventStyleGetter(e as CalendarEvent)}
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

      {/* Side-by-side layout: 40% monthly + 60% daily */}
      <div className="w-full px-5 sm:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ═══ LEFT: MONTHLY FOCUS (40%) ═══ */}
          <section className="w-full lg:w-[35%] lg:sticky lg:top-[110px] rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
            <button onClick={() => setFocusOpen(!focusOpen)}
              className="w-full bg-brand-600 px-5 py-3.5 flex items-center justify-between text-left hover:bg-brand-700 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div className="flex items-center gap-1">
                  <span onClick={(e) => { e.stopPropagation(); setCalDate(addMonths(calDate, -1)); }}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors" title="Previous month">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </span>
                  <h2 className="text-white font-semibold text-base">{MONTHS[calDate.getMonth()]} {calDate.getFullYear()}</h2>
                  <span onClick={(e) => { e.stopPropagation(); setCalDate(addMonths(calDate, 1)); }}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors" title="Next month">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {focusLoaded && !focusEditing && focusOpen && (
                  <span onClick={(e) => { e.stopPropagation(); setFocusEditing(true); }}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium cursor-pointer">Edit</span>
                )}
                <svg className={`w-4 h-4 text-white/70 transition-transform ${focusOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <div className={`transition-all duration-300 overflow-hidden ${focusOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
              {focusLoaded && (
                <div className="p-4">
                  {focusEditing ? (
                    <div className="space-y-3">
                      {/* 2 items per row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {focusFields.map(({ key, label, icon }) => (
                          <div key={key} className="rounded-lg border border-gray-200 p-3">
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-2">
                              <span>{icon}</span>{label}
                            </label>
                            <textarea rows={3} value={(focus as unknown as Record<string, string>)[key]}
                              onChange={(e) => {
                                const formatted = bulletFormat(e.target.value);
                                setFocus((p) => ({ ...p, [key]: formatted }));
                              }}
                              className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                              placeholder={`• Your ${label.toLowerCase()}...`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setFocusEditing(false)} className="px-4 py-1.5 text-gray-500 hover:bg-gray-100 rounded text-sm">Cancel</button>
                        <button onClick={saveFocus} disabled={focusSaving}
                          className="px-5 py-1.5 bg-brand-600 text-white rounded text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                          {focusSaving ? 'Saving...' : 'Save Focus'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only: 2 per row */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {focusFields.map(({ key, label, icon }) => (
                        <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><span>{icon}</span>{label}</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {(focus as unknown as Record<string, string>)[key] || <span className="text-gray-400 italic">Not set</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ═══ RIGHT: DAILY PLANNER (60%) ═══ */}
          <div className="w-full lg:flex-1 min-w-0">
          {selectedDate ? (
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">

            {/* Date header */}
            <div className="bg-brand-600 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📅</span>
                <div>
                  <h2 className="text-white font-semibold text-base leading-tight">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <p className="text-brand-200 text-xs">Daily Planner</p>
                </div>
              </div>
              <button onClick={savePlanner} disabled={plannerSaving}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5">
                {plannerSaving ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span>💾</span>}
                {plannerSaving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Tabs - underline style */}
            <div className="border-b border-gray-200 px-4 flex gap-0 overflow-x-auto scrollbar-none">
              {tabs.map((tab, idx) => (
                <button key={idx} onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-[1px]
                    ${activeTab === idx ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <span className="text-sm">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {plannerLoaded ? (
              <div className="p-5">

                {/* ──── TAB 0: Morning Log ──── */}
                {activeTab === 0 && (
                  <div className="space-y-5">
                    {/* Feeling + Affirmation side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-700 mb-3">How am I feeling this morning?</h3>
<div className={`flex items-start gap-3 rounded-lg border p-4 h-[calc(100%-40px)] transition-colors ${isFieldError('feeling') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                          <div className="flex-1">
                            <textarea rows={3} value={planner.feeling}
                              onChange={(e) => handleBulletPlanner('feeling', e.target.value)}
                              className="w-full resize-none bg-transparent outline-none text-base text-gray-700 placeholder-gray-400" placeholder="• Describe your mood, energy level..." />
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <StarRating value={planner.feelingRating} onChange={(v) => setPlanner((p) => ({ ...p, feelingRating: v }))} />
                          </div>
                        </div>
                        {isFieldError('feeling') && (
                          <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-gray-700 mb-3">My affirmation for the Day</h3>
                        <div className="rounded-lg border border-gray-200 p-4 h-[calc(100%-40px)]">
                          <textarea rows={3} value={planner.affirmation}
                            onChange={(e) => handleBulletPlanner('affirmation', e.target.value)}
                            className="w-full resize-none bg-transparent outline-none text-base text-gray-700 placeholder-gray-400" placeholder="• Today I will..." />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-gray-700 mb-3">🎯 Today&apos;s Goals</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { key: 'goalAcademic', label: 'Academic', icon: '📚' },
                          { key: 'goalReadingBooks', label: 'Reading Books', icon: '📖' },
                          { key: 'goalNonAcademic', label: 'Non-Academic', icon: '🎨' },
                          { key: 'goalHabitFocus', label: 'Habit Focus', icon: '🔄' },
                          { key: 'goalPsychological', label: 'Psychological', icon: '🧠' },
                          { key: 'goalPhysical', label: 'Physical', icon: '💪' },
                        ].map(({ key, label, icon }) => (
                          <div key={key} className="rounded-lg border border-gray-200 p-3">
                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5"><span>{icon}</span>{label}</label>
                            <textarea rows={2} value={(planner as unknown as Record<string, string>)[key]}
                              onChange={(e) => handleBulletPlanner(key, e.target.value)}
                              className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                              placeholder={`• ${label} goal...`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── TAB 1: Today's Plan ──── */}
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
                    <p className="text-xs text-gray-400">Only rows with time, activity, and type filled will be saved.</p>

                    {planner.plans.map((session, sIdx) => {
                      const fixed = SESSION_FIXED[session.session];
                      return (
                        <div key={session.session} className="rounded-lg border border-gray-200 overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                            <span>{SESSION_ICONS[session.session]}</span>
                            <span className="text-sm font-semibold text-gray-700">{session.session}</span>
                          </div>
                          <div className="p-3 space-y-1.5">
                            {/* Fixed BEFORE */}
                            {fixed?.before && (
                              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                <span className="text-xs text-gray-500 font-semibold uppercase w-20">{fixed.before}</span>
                                <input type="time" value={(planner as unknown as Record<string, string>)[FIXED_TIME_KEYS[fixed.before] as string] || ''}
                                  onChange={(e) => setPlanner((p) => ({ ...p, [FIXED_TIME_KEYS[fixed.before!]]: e.target.value }))}
                                  className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-300 outline-none bg-white" />
                              </div>
                            )}
                            {session.rows.map((row, rIdx) => {
                              const isComplete = row.time.trim() && row.activity.trim() && row.type !== '';
                              const isPartial = row.time.trim() || row.activity.trim() || row.type !== '';
                              return (
                                <div key={rIdx} className={`flex items-center gap-1.5 group ${isPartial && !isComplete ? 'bg-amber-50/50 rounded px-1 -mx-1' : ''}`}>
                                  <input type="time" value={row.time}
                                    onChange={(e) => updatePlan(sIdx, rIdx, 'time', e.target.value)}
                                    className="w-[110px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-300 outline-none" />
                                  <input type="text" placeholder="Activity" value={row.activity}
                                    onChange={(e) => updatePlan(sIdx, rIdx, 'activity', e.target.value)}
                                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-300 outline-none" />
                                  <select value={row.type} onChange={(e) => updatePlan(sIdx, rIdx, 'type', e.target.value)}
                                    className="w-16 px-1 py-1.5 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-brand-300 outline-none">
                                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                  {session.rows.length > 1 && (
                                    <button onClick={() => removePlanRow(sIdx, rIdx)}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {/* Fixed AFTER */}
                            {fixed?.after && (
                              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                <span className="text-xs text-gray-500 font-semibold uppercase w-20">{fixed.after}</span>
                                <input type="time" value={(planner as unknown as Record<string, string>)[FIXED_TIME_KEYS[fixed.after] as string] || ''}
                                  onChange={(e) => setPlanner((p) => ({ ...p, [FIXED_TIME_KEYS[fixed.after!]]: e.target.value }))}
                                  className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-300 outline-none bg-white" />
                              </div>
                            )}
                            <button onClick={() => addPlanRow(sIdx)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded transition-colors font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Add Row
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ──── TAB 2: Accomplishments ──── */}
                {activeTab === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-700">🏆 Accomplishments</h3>
                    </div>
                    <p className="text-xs text-gray-400">Activities from Today&apos;s Plan grouped by domain. Update completion status and experience here.</p>

                    {DOMAINS.map((domainName) => {
                      // Gather all plan rows that belong to this domain
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
                            <span className="text-xs text-gray-400">{domainRows.filter(d => d.row.completed === 'Yes').length}/{domainRows.length} completed</span>
                          </div>
                          <div className="p-3 space-y-1.5">
                            <div className="grid grid-cols-[80px_1fr_100px_1fr] gap-1.5 text-xs font-semibold text-gray-400 uppercase px-0.5">
                              <span>Session</span><span>Activity</span><span>Status</span><span>Experience</span>
                            </div>
                            {domainRows.map(({ sIdx, rIdx, row }) => (
                              <div key={`${sIdx}-${rIdx}`} className="grid grid-cols-[80px_1fr_100px_1fr] gap-1.5">
                                <span className="px-2 py-1.5 text-xs text-gray-500 flex items-center gap-1">
                                  <span>{SESSION_ICONS[planner.plans[sIdx].session]}</span>
                                  <span className="text-[10px]">{planner.plans[sIdx].session.slice(0, 4)}</span>
                                </span>
                                <span className="px-2 py-1.5 border border-gray-100 rounded text-xs bg-gray-50 text-gray-600 truncate">{row.activity}</span>
                                <select value={row.completed} onChange={(e) => updatePlan(sIdx, rIdx, 'completed', e.target.value)}
                                  className="px-1 py-1.5 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-brand-300 outline-none">
                                  <option value="">—</option>
                                  <option value="Yes">Completed</option>
                                  <option value="No">No</option>
                                  <option value="Partial">In Progress</option>
                                </select>
                                <input type="text" placeholder="Experience" value={row.experience}
                                  onChange={(e) => updatePlan(sIdx, rIdx, 'experience', e.target.value)}
                                  className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-300 outline-none" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className={`rounded-lg border p-4 transition-colors ${isFieldError('blessings') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-gray-600">✨ Blessings earned for the day!</label>
                          <StarRating size="sm" value={planner.blessingsRating}
                            onChange={(v) => setPlanner((p) => ({ ...p, blessingsRating: v }))} />
                        </div>
                        <textarea rows={2} value={planner.blessings}
                          onChange={(e) => handleBulletPlanner('blessings', e.target.value)}
                          className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" placeholder="• What blessings did you earn?" />
                        {isFieldError('blessings') && (
                          <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                        )}
                      </div>
                      <div className={`rounded-lg border p-4 transition-colors ${isFieldError('happyMoment') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-gray-600">😊 Happy moment of the day</label>
                          <StarRating size="sm" value={planner.happyMomentRating}
                            onChange={(v) => setPlanner((p) => ({ ...p, happyMomentRating: v }))} />
                        </div>
                        <textarea rows={2} value={planner.happyMoment}
                          onChange={(e) => handleBulletPlanner('happyMoment', e.target.value)}
                          className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" placeholder="• What made you smile?" />
                        {isFieldError('happyMoment') && (
                          <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── TAB 3: Night Log ──── */}
                {activeTab === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-700">🌙 Review of the Day</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                        <h4 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">⏱ Time you spent on…</h4>
                        <DurationInput label="📱 Mobile / TV / Laptop" value={planner.nightLog.mobileTime} onChange={(v) => setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, mobileTime: v } }))} />
                        <DurationInput label="📲 Social Media" value={planner.nightLog.socialMediaTime} onChange={(v) => setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, socialMediaTime: v } }))} />
                        <DurationInput label="📖 Study*" value={planner.nightLog.studyTime} onChange={(v) => setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, studyTime: v } }))} />
                        <DurationInput label="🏋️ Physical Exercise" value={planner.nightLog.physicalExerciseTime} onChange={(v) => setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, physicalExerciseTime: v } }))} />
                        <DurationInput label="📚 Reading" value={planner.nightLog.readingTime} onChange={(v) => setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, readingTime: v } }))} />
                        <p className="text-[10px] text-gray-400 italic">*Excluding school/coaching class time</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4 space-y-2.5">
                        <h4 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">📝 5 New Words Today</h4>
                        {planner.nightLog.newWords.map((word, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                            <input type="text" value={word}
                              onChange={(e) => { const w = [...planner.nightLog.newWords]; w[idx] = e.target.value; setPlanner((p) => ({ ...p, nightLog: { ...p.nightLog, newWords: w } })); }}
                              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-brand-300 outline-none" placeholder={`Word ${idx + 1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── TAB 4: Self-Care ──── */}
                {activeTab === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-700">💜 Self-Care Tracker</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ratings */}
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
                            <StarRating value={(planner.selfCare as unknown as Record<string, number>)[key]}
                              onChange={(v) => setPlanner((p) => ({ ...p, selfCare: { ...p.selfCare, [key]: v } }))} />
                          </div>
                        ))}
                      </div>

                      {/* Text fields with star ratings */}
                      <div className="space-y-3">
                        {/* Self-Reflection */}
                        <div className={`rounded-lg border p-3 transition-colors ${isFieldError('selfReflection') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-gray-600">🪻 Self-Reflection / Self-Advice</label>
                            <StarRating size="sm" value={planner.selfCare.selfReflectionRating}
                              onChange={(v) => setPlanner((p) => ({ ...p, selfCare: { ...p.selfCare, selfReflectionRating: v } }))} />
                          </div>
                          <textarea rows={2} value={planner.selfCare.selfReflection}
                            onChange={(e) => handleBulletSelfCare('selfReflection', e.target.value)}
                            className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" placeholder="• Reflect on your day..." />
                          {isFieldError('selfReflection') && (
                            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                          )}
                        </div>

                        {/* Skills Used */}
                        <div className={`rounded-lg border p-3 transition-colors ${isFieldError('skillsUsed') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-gray-600">🛠 Skills I used today</label>
                            <StarRating size="sm" value={planner.selfCare.skillsUsedRating}
                              onChange={(v) => setPlanner((p) => ({ ...p, selfCare: { ...p.selfCare, skillsUsedRating: v } }))} />
                          </div>
                          <textarea rows={2} value={planner.selfCare.skillsUsed}
                            onChange={(e) => handleBulletSelfCare('skillsUsed', e.target.value)}
                            className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" placeholder="• Skills practiced..." />
                          {isFieldError('skillsUsed') && (
                            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                          )}
                        </div>

                        {/* Achievements */}
                        <div className={`rounded-lg border p-3 transition-colors ${isFieldError('achievements') ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-gray-600">🏅 My Achievements</label>
                            <StarRating size="sm" value={planner.selfCare.achievementsRating}
                              onChange={(v) => setPlanner((p) => ({ ...p, selfCare: { ...p.selfCare, achievementsRating: v } }))} />
                          </div>
                          <textarea rows={2} value={planner.selfCare.achievements}
                            onChange={(e) => handleBulletSelfCare('achievements', e.target.value)}
                            className="w-full resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" placeholder="• What did you achieve?" />
                          {isFieldError('achievements') && (
                            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><span>⚠️</span> Both text and a star rating are required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save bottom */}
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-5">
                  <button onClick={savePlanner} disabled={plannerSaving}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]">
                    {plannerSaving
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
                      : <>💾 Save All Changes</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            )}
          </section>
        ) : (
          /* Empty state */
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-20">
            <span className="text-5xl mb-3">📅</span>
            <p className="text-gray-500 font-semibold text-lg">Select a date</p>
            <p className="text-gray-400 text-sm mt-1">Click the Calendar button above to pick a day</p>
          </div>
        )}
          </div>
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
        .rbc-event:focus { outline: 2px solid #4d76be !important; outline-offset: 1px; }
        .rbc-show-more { color: #2959ba !important; font-weight: 600 !important; font-size: 10px !important; }
        .rbc-day-bg:hover { background: #EEF2F9 !important; cursor: pointer; }
        .rbc-time-view { border: none !important; }
        .rbc-month-view .rbc-month-row { min-height: 50px; }
      `}</style>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading Activity...</p>
        </div>
      </div>
    }>
      <ActivityContent />
    </Suspense>
  );
}
