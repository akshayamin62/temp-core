'use client';

import { useEffect, useState } from 'react';
import { activityAPI } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

/* ─── Types ─── */
interface AnalyticsData {
  completionByDate: { date: string; planned: number; completed: number; partial: number }[];
  domainBalance: Record<string, { planned: number; completed: number }>;
  moodTrend: { date: string; feeling: number; sleep: number; exercise: number; diet: number; study: number; productivity: number }[];
  timeAllocation: { date: string; mobile: number; socialMedia: number; study: number; exercise: number; reading: number }[];
  streak: { current: number; longest: number; totalDays: number };
  wordCount: { total: number; thisMonth: number };
  heatmap: { date: string; status: string; filled: number }[];
  selfCareAvg: { sleep: number; exercise: number; diet: number; study: number; productivity: number };
}

interface Props {
  registrationId: string;
}

const BRAND = '#2959ba';
const BRAND_LIGHT = '#6b8fd4';
const ACCENT = '#10b981';
const ACCENT2 = '#f59e0b';
const WARN = '#ef4444';

/* palette for domains */
const DOMAIN_COLORS: Record<string, string> = {
  Academic: '#2959ba',
  'Reading Books': '#10b981',
  'Non-Academic': '#8b5cf6',
  'Habit Focus': '#f59e0b',
  Psychological: '#ec4899',
  Physical: '#06b6d4',
};

export default function ActivityAnalyticsDashboard({ registrationId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await activityAPI.getActivityAnalytics(registrationId, months);
        setData(res.data.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [registrationId, months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-base">No activity data available yet. Start filling your daily planner!</p>
      </div>
    );
  }

  const hasCompletionData = data.completionByDate.length > 0;
  const hasMoodData = data.moodTrend.length > 0;
  const hasTimeData = data.timeAllocation.length > 0;

  /* radar data */
  const radarData = Object.entries(data.domainBalance).map(([domain, val]) => ({
    domain: domain.length > 12 ? domain.slice(0, 10) + '…' : domain,
    fullDomain: domain,
    planned: val.planned,
    completed: val.completed,
    pct: val.planned ? Math.round((val.completed / val.planned) * 100) : 0,
  }));

  /* completion chart: aggregate by week when > 60 days, by month when > 180 days */
  const completionData = (() => {
    const raw = data.completionByDate;
    if (raw.length <= 60) {
      // Show individual days
      return raw.map(d => ({ ...d, date: d.date.slice(8) + '/' + d.date.slice(5, 7) }));
    } else if (raw.length <= 180) {
      // Aggregate by ISO week
      const weeks = new Map<string, { planned: number; completed: number; partial: number }>();
      for (const d of raw) {
        const dt = new Date(d.date + 'T00:00:00');
        // Get start of week (Monday)
        const day = dt.getDay() || 7;
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - day + 1);
        const wk = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
        const existing = weeks.get(wk) || { planned: 0, completed: 0, partial: 0 };
        existing.planned += d.planned;
        existing.completed += d.completed;
        existing.partial += d.partial;
        weeks.set(wk, existing);
      }
      return Array.from(weeks.entries()).map(([date, v]) => ({ date, ...v }));
    } else {
      // Aggregate by month
      const monthMap = new Map<string, { planned: number; completed: number; partial: number }>();
      for (const d of raw) {
        const ym = d.date.slice(0, 7);
        const existing = monthMap.get(ym) || { planned: 0, completed: 0, partial: 0 };
        existing.planned += d.planned;
        existing.completed += d.completed;
        existing.partial += d.partial;
        monthMap.set(ym, existing);
      }
      const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Array.from(monthMap.entries()).map(([ym, v]) => {
        const [y, m] = ym.split('-');
        return { date: `${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`, ...v };
      });
    }
  })();

  /* mood chart: same smart aggregation */
  const moodData = (() => {
    const raw = data.moodTrend;
    if (raw.length <= 60) return raw.map(d => ({ ...d, date: d.date.slice(8) + '/' + d.date.slice(5, 7) }));
    // Aggregate by week
    const weeks = new Map<string, { count: number; feeling: number; sleep: number; exercise: number; diet: number; study: number; productivity: number }>();
    for (const d of raw) {
      const dt = new Date(d.date + 'T00:00:00');
      const day = dt.getDay() || 7;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - day + 1);
      const wk = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
      const ex = weeks.get(wk) || { count: 0, feeling: 0, sleep: 0, exercise: 0, diet: 0, study: 0, productivity: 0 };
      ex.count++; ex.feeling += d.feeling; ex.sleep += d.sleep; ex.exercise += d.exercise;
      ex.diet += d.diet; ex.study += d.study; ex.productivity += d.productivity;
      weeks.set(wk, ex);
    }
    return Array.from(weeks.entries()).map(([date, v]) => ({
      date,
      feeling: Math.round((v.feeling / v.count) * 10) / 10,
      sleep: Math.round((v.sleep / v.count) * 10) / 10,
      exercise: Math.round((v.exercise / v.count) * 10) / 10,
      diet: Math.round((v.diet / v.count) * 10) / 10,
      study: Math.round((v.study / v.count) * 10) / 10,
      productivity: Math.round((v.productivity / v.count) * 10) / 10,
    }));
  })();

  /* time chart: same aggregation */
  const timeData = (() => {
    const raw = data.timeAllocation;
    if (raw.length <= 60) return raw.map(d => ({ ...d, date: d.date.slice(8) + '/' + d.date.slice(5, 7) }));
    const weeks = new Map<string, { count: number; mobile: number; socialMedia: number; study: number; exercise: number; reading: number }>();
    for (const d of raw) {
      const dt = new Date(d.date + 'T00:00:00');
      const day = dt.getDay() || 7;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - day + 1);
      const wk = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
      const ex = weeks.get(wk) || { count: 0, mobile: 0, socialMedia: 0, study: 0, exercise: 0, reading: 0 };
      ex.count++; ex.mobile += d.mobile; ex.socialMedia += d.socialMedia; ex.study += d.study;
      ex.exercise += d.exercise; ex.reading += d.reading;
      weeks.set(wk, ex);
    }
    return Array.from(weeks.entries()).map(([date, v]) => ({
      date,
      mobile: Math.round(v.mobile / v.count),
      socialMedia: Math.round(v.socialMedia / v.count),
      study: Math.round(v.study / v.count),
      exercise: Math.round(v.exercise / v.count),
      reading: Math.round(v.reading / v.count),
    }));
  })();

  /* self-care radar */
  const selfCareRadar = [
    { metric: 'Sleep', value: data.selfCareAvg.sleep },
    { metric: 'Exercise', value: data.selfCareAvg.exercise },
    { metric: 'Diet', value: data.selfCareAvg.diet },
    { metric: 'Study', value: data.selfCareAvg.study },
    { metric: 'Productivity', value: data.selfCareAvg.productivity },
  ];

  /* heatmap: build calendar grid */
  const heatmapMap = new Map(data.heatmap.map(h => [h.date, h]));

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📊</span> Activity Analysis
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
          {[
            { m: 1, label: '1 Mo' },
            { m: 3, label: '3 Mo' },
            { m: 6, label: '6 Mo' },
            { m: 12, label: '1 Year' },
            { m: 24, label: '2 Years' },
            { m: 36, label: '3 Years' },
            { m: 60, label: '5 Years' },
          ].map(({ m, label }) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                months === m ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon="🔥" label="Current Streak" value={`${data.streak.current} days`} accent="orange" />
        <StatCard icon="🏆" label="Longest Streak" value={`${data.streak.longest} days`} accent="yellow" />
        <StatCard icon="📅" label="Total Days" value={`${data.streak.totalDays}`} accent="blue" />
        <StatCard icon="📝" label="New Words" value={`${data.wordCount.total}`} sub={`${data.wordCount.thisMonth} this month`} accent="green" />
        {(() => {
          const entries = Object.values(data.domainBalance);
          const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
          const totalCompleted = entries.reduce((s, e) => s + e.completed, 0);
          const overall = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 50) / 10 : 0; // out of 5
          return <StatCard icon="⭐" label="Overall Performance" value={`${overall} / 5`} sub={`${totalCompleted}/${totalPlanned} completed`} accent="purple" />;
        })()}
      </div>

      {/* ─── Row 1: Completion + Domain Balance ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Rate Bar Chart */}
        <ChartCard title={`Activity Completion Rate${completionData.length <= 60 ? '' : completionData.length <= 180 ? ' (weekly avg)' : ' (monthly)'}`} icon="📈">
          {hasCompletionData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completionData} barSize={completionData.length > 30 ? 8 : completionData.length > 15 ? 12 : 16} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} interval={completionData.length > 20 ? Math.floor(completionData.length / 12) : 0} angle={completionData.length > 15 ? -45 : 0} textAnchor={completionData.length > 15 ? 'end' : 'middle'} height={completionData.length > 15 ? 50 : 30} />
                <YAxis tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
                <Tooltip contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e5e7eb', color: '#000', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, color: '#000' }} />
                <Bar dataKey="planned" fill={BRAND_LIGHT} name="Planned" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill={ACCENT} name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="partial" fill={ACCENT2} name="Partial" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Domain Balance Radar */}
        <ChartCard title="Domain Balance" icon="🎯">
          {radarData.some(d => d.planned > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
                <PolarRadiusAxis tick={{ fontSize: 11, fill: '#000', fontWeight: 600 }} />
                <Radar name="Planned" dataKey="planned" stroke={BRAND} fill={BRAND} fillOpacity={0.15} />
                <Radar name="Completed" dataKey="completed" stroke={ACCENT} fill={ACCENT} fillOpacity={0.25} />
                <Tooltip contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e5e7eb', color: '#000', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, color: '#000' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* ─── Row 2: Mood Trends + Self-Care ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mood & Rating Trends */}
        <ChartCard title="Mood & Rating Trends" icon="😊">
          {hasMoodData ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
                <Tooltip contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e5e7eb', color: '#000', fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, color: '#000' }} />
                <Line type="monotone" dataKey="feeling" stroke={WARN} name="Feeling" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sleep" stroke={BRAND} name="Sleep" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="exercise" stroke={ACCENT} name="Exercise" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" name="Productivity" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Self-Care Average Radar */}
        <ChartCard title="Self-Care Average" icon="💪">
          {selfCareRadar.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={selfCareRadar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 13, fill: '#000', fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#000', fontWeight: 600 }} />
                <Radar name="Average Rating" dataKey="value" stroke={BRAND} fill={BRAND} fillOpacity={0.3} />
                <Tooltip contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e5e7eb', color: '#000', fontWeight: 600 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* ─── Row 3: Time Allocation ─── */}
      {hasTimeData && (
        <ChartCard title="Time Allocation (minutes)" icon="⏱️">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 12, fill: '#000', fontWeight: 700 }} />
              <Tooltip contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e5e7eb', color: '#000', fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, color: '#000' }} />
              <Area type="monotone" dataKey="study" stroke={BRAND} fill={BRAND} fillOpacity={0.15} name="Study" />
              <Area type="monotone" dataKey="reading" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} name="Reading" />
              <Area type="monotone" dataKey="exercise" stroke={ACCENT2} fill={ACCENT2} fillOpacity={0.15} name="Exercise" />
              <Area type="monotone" dataKey="mobile" stroke={WARN} fill={WARN} fillOpacity={0.1} name="Mobile" />
              <Area type="monotone" dataKey="socialMedia" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} name="Social Media" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ─── Row 4: Activity Heatmap ─── */}
      {data.heatmap.length > 0 && (
        <ChartCard title="Goals Completed Heatmap" icon="🗓️">
          <HeatmapGrid heatmap={data.heatmap} />
        </ChartCard>
      )}

      {/* ─── Row 5: Domain Breakdown Table ─── */}
      {radarData.some(d => d.planned > 0) && (
        <ChartCard title="Domain Breakdown" icon="📋">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">Domain</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700">Planned</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700">Completed</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700">Rate</th>
                  <th className="text-left py-2 pl-3 font-semibold text-gray-700 w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {radarData.map(d => (
                  <tr key={d.fullDomain} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d.fullDomain] || BRAND }} />
                        {d.fullDomain}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3 text-gray-600">{d.planned}</td>
                    <td className="text-center py-2 px-3 text-gray-600">{d.completed}</td>
                    <td className="text-center py-2 px-3 font-semibold" style={{ color: d.pct >= 70 ? ACCENT : d.pct >= 40 ? ACCENT2 : WARN }}>
                      {d.pct}%
                    </td>
                    <td className="py-2 pl-3">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(d.pct, 100)}%`, backgroundColor: DOMAIN_COLORS[d.fullDomain] || BRAND }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent: string }) {
  const bg = accent === 'orange' ? 'bg-orange-50 border-orange-200' :
    accent === 'yellow' ? 'bg-amber-50 border-amber-200' :
    accent === 'blue' ? 'bg-blue-50 border-blue-200' :
    accent === 'purple' ? 'bg-purple-50 border-purple-200' :
    'bg-emerald-50 border-emerald-200';
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[260px]">
      <p className="text-base text-gray-400">Not enough data yet</p>
    </div>
  );
}

function HeatmapGrid({ heatmap }: { heatmap: { date: string; status: string; filled: number }[] }) {
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  const CELL = 15;   // px — same fixed size as GitHub
  const GAP  = 6;    // px

  const now = new Date();
  const currentYear = now.getFullYear();

  // Available years derived from data + current year
  const yearsInData = new Set(heatmap.map(h => parseInt(h.date.slice(0, 4))));
  yearsInData.add(currentYear);
  const availableYears = Array.from(yearsInData).sort((a, b) => b - a);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const heatmapMap = new Map(heatmap.map(h => [h.date, h]));

  // Build day list for the selected year (Jan 1 → Dec 31, or today if current year)
  const days: { date: string; status: string; filled: number; month: number }[] = [];
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd   = selectedYear === currentYear ? now : new Date(selectedYear, 11, 31);
  const cursor = new Date(yearStart);
  while (cursor <= yearEnd) {
    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const entry = heatmapMap.get(ds);
    days.push({ date: ds, status: entry?.status || 'empty', filled: entry?.filled || 0, month: cursor.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (days.length === 0) {
    return <p className="text-base text-gray-400 text-center py-4">No data for {selectedYear}</p>;
  }

  // Pad to Sunday-aligned start
  const padCount = new Date(days[0].date + 'T00:00:00').getDay();
  const padded = Array.from({ length: padCount }, () => ({ date: '', status: 'pad', filled: 0, month: -1 }));
  const all = [...padded, ...days];

  // Chunk into weeks (53 max)
  const weeks: typeof all[] = [];
  for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));

  // Month label positions (week-column index where each month first appears)
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(d => d.date && d.status !== 'pad');
    if (first && first.month !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[first.month], col: wi });
      lastMonth = first.month;
    }
  });

  const cellColor = (status: string, filled: number) => {
    if (status === 'pad')   return 'transparent';
    if (status === 'empty') return '#ebedf0';
    if (filled >= 6)        return '#1e3fa8';
    if (filled >= 5)        return '#2959ba';
    if (filled >= 4)        return '#3a6ec5';
    if (filled >= 3)        return '#5b8ad4';
    if (filled >= 2)        return '#93b4e4';
    if (filled >= 1)        return '#c4d5f0';
    return '#ebedf0';
  };

  const cellTitle = (day: typeof all[0]) => {
    if (!day.date) return '';
    const dt = new Date(day.date + 'T00:00:00');
    const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return day.status === 'empty'
      ? `${label}: No goals completed`
      : `${label}: ${day.filled}/6 goals completed`;
  };

  const activeDays = days.filter(d => d.status !== 'empty').length;
  const DAY_LABEL_W = 30; // px for Mon/Wed/Fri labels

  return (
    <div className="w-full">
      {/* Year tabs + active-day count */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                selectedYear === y
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'text-gray-500 bg-white border-gray-200 hover:border-brand-400 hover:text-brand-600'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{activeDays}</span> active {activeDays === 1 ? 'day' : 'days'} in {selectedYear}
        </span>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: weeks.length * (CELL + GAP) + DAY_LABEL_W + 8, display: 'inline-block' }}>

          {/* Month labels */}
          <div style={{ display: 'flex', marginLeft: DAY_LABEL_W + 4, marginBottom: 6 }}>
            {weeks.map((_, wi) => {
              const mp = monthPositions.find(m => m.col === wi);
              return (
                <div key={wi} style={{ width: CELL + GAP, flexShrink: 0 }}>
                  {mp && (
                    <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {mp.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day labels + cell grid */}
          <div style={{ display: 'flex', gap: 0 }}>
            {/* Day-of-week labels */}
            <div style={{ width: DAY_LABEL_W, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 6,
                    fontSize: 12,
                    color: '#9ca3af',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: 'flex', gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={cellTitle(day)}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        backgroundColor: cellColor(day.status, day.filled),
                        flexShrink: 0,
                        cursor: day.date ? 'default' : 'default',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — 7 activity levels */}
      <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
        {[
          { color: '#ebedf0', label: '0 goals' },
          { color: '#c4d5f0', label: '1 goal' },
          { color: '#93b4e4', label: '2 goals' },
          { color: '#5b8ad4', label: '3 goals' },
          { color: '#3a6ec5', label: '4 goals' },
          { color: '#2959ba', label: '5 goals' },
          { color: '#1e3fa8', label: '6 goals' },
        ].map(({ color, label }) => (
          <span key={color} className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
            <span className="text-gray-700 font-semibold">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
